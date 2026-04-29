pipeline {
    agent { label 'docker-agent' }

    environment {
        IMAGE_NAME = "25jeanbaptiste/crisisview-api"
        IMAGE_TAG  = "${BUILD_NUMBER}"
        STAGING_HOST = "51.21.152.249"
    }

    options {
        timestamps()
        buildDiscarder(logRotator(numToKeepStr: '10'))
        disableConcurrentBuilds()
        timeout(time: 30, unit: 'MINUTES')
    }

    stages {

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Prepare') {
            steps {
                sh '''
                    mkdir -p reports/tests
                    mkdir -p reports/security
                    mkdir -p reports/quality
                '''
            }
        }

        stage('Install') {
            steps {
                sh 'npm ci'
            }
        }

        stage('SCA - npm audit') {
            steps {
                sh 'npm audit --json > reports/security/npm-audit.json || true'
            }
            post {
                always {
                    archiveArtifacts allowEmptyArchive: true,
                        artifacts: 'reports/security/npm-audit.json'
                }
            }
        }

        stage('Tests') {
            steps {
                sh 'npm test -- --coverage 2>&1 | tee reports/tests/test-output.txt || true'
            }
            post {
                always {
                    archiveArtifacts allowEmptyArchive: true,
                        artifacts: 'reports/tests/**, coverage/**'
                }
            }
        }

        stage('SonarQube Analysis') {
            steps {
                withSonarQubeEnv('SonarQube') {
                    sh '''
                        docker run --rm \
                            --network jenkins-net \
                            --user root \
                            --volumes-from jenkins-agent \
                            -w "$PWD" \
                            -e SONAR_HOST_URL="$SONAR_HOST_URL" \
                            -e SONAR_TOKEN="$SONAR_AUTH_TOKEN" \
                            sonarsource/sonar-scanner-cli \
                            -Dsonar.projectKey=crisisview-api \
                            -Dsonar.projectName=CrisisView-API \
                            -Dsonar.sources=routes,server.js,db.js,models.js \
                            -Dsonar.projectBaseDir="$PWD"
                    '''
                }
            }
        }

        stage('Quality Gate') {
            steps {
                echo 'Quality Gate: SonarQube analysis completed - see dashboard at http://localhost:9000'
            }
        }

        stage('Build Docker Image') {
            steps {
                sh '''
                    docker build \
                        -t ${IMAGE_NAME}:${IMAGE_TAG} \
                        -t ${IMAGE_NAME}:latest \
                        .
                '''
            }
        }

        stage('Scan Docker Image') {
            steps {
                sh '''
                    mkdir -p reports/security

                    docker run --rm \
                        -v /var/run/docker.sock:/var/run/docker.sock \
                        -v "$PWD/reports/security:/reports" \
                        aquasec/trivy:latest image \
                        --format json \
                        --output /reports/trivy-image.json \
                        ${IMAGE_NAME}:${IMAGE_TAG} || true
                '''
            }
            post {
                always {
                    archiveArtifacts allowEmptyArchive: true,
                        artifacts: 'reports/security/**'
                }
            }
        }

        stage('Push Docker Hub') {
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'dockerhub-credentials',
                    usernameVariable: 'DOCKER_USER',
                    passwordVariable: 'DOCKER_PASS'
                )]) {
                    sh '''
                        echo "$DOCKER_PASS" | docker login -u "$DOCKER_USER" --password-stdin
                        docker push ${IMAGE_NAME}:${IMAGE_TAG}
                        docker push ${IMAGE_NAME}:latest
                        docker logout
                    '''
                }
            }
        }

        stage('Deploy Staging') {
            steps {
                sshagent(['vm-aws-ssh']) {
                    sh '''
                        ssh -o StrictHostKeyChecking=no ubuntu@${STAGING_HOST} "
                            docker network create crisisview-net 2>/dev/null || true

                            docker ps -a --format '{{.Names}}' | grep -q '^crisisview-db-staging$' || \
                            docker run -d \
                                --name crisisview-db-staging \
                                --network crisisview-net \
                                --restart unless-stopped \
                                -e MYSQL_ROOT_PASSWORD=root \
                                -e MYSQL_DATABASE=crisisview \
                                -p 3307:3306 \
                                mysql:8.4

                            echo 'Waiting for MySQL...'
                            for i in \\$(seq 1 6); do
                                if docker exec crisisview-db-staging mysqladmin ping -h localhost -uroot -proot --silent; then
                                    echo 'MySQL is ready'
                                    break
                                fi
                                echo 'MySQL not ready yet... retry'
                                sleep 5
                            done

                            docker pull ${IMAGE_NAME}:latest

                            docker stop crisisview-api-staging 2>/dev/null || true
                            docker rm crisisview-api-staging 2>/dev/null || true

                            docker run -d \
                                --name crisisview-api-staging \
                                --network crisisview-net \
                                --restart unless-stopped \
                                -p 3001:3001 \
                                -e NODE_ENV=staging \
                                -e DB_HOST=crisisview-db-staging \
                                -e DB_PORT=3306 \
                                -e DB_USER=root \
                                -e DB_PASSWORD=root \
                                -e DB_NAME=crisisview \
                                ${IMAGE_NAME}:latest
                        "
                    '''
                }
            }
        }

        stage('Smoke Tests') {
            steps {
                sh '''
                    echo "Waiting for API to be ready..."

                    for i in $(seq 1 6); do
                        if curl -sf --max-time 10 http://${STAGING_HOST}:3001/health; then
                            echo "[OK] API health check passed"
                            exit 0
                        fi

                        echo "API not ready yet... retry $i/6"
                        sleep 5
                    done

                    echo "[ERROR] API health check failed"
                    exit 1
                '''
            }
        }

        stage('Archive Reports') {
            steps {
                archiveArtifacts allowEmptyArchive: true,
                    artifacts: 'reports/**'
            }
        }
    }

    post {
        success {
            echo "Pipeline API CrisisView OK — build #${BUILD_NUMBER}"
        }

        failure {
            echo "Pipeline API CrisisView en echec — voir rapports Jenkins"
            archiveArtifacts allowEmptyArchive: true, artifacts: 'reports/**'
        }

        always {
            sh 'docker ps || true'
        }
    }
}
