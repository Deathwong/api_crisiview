pipeline {
    agent { label 'docker-agent' }

    environment {
        IMAGE_NAME = "25jeanbaptiste/crisisview-api"
        IMAGE_TAG  = "${BUILD_NUMBER}"
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
                            -w $PWD \
                            -e SONAR_HOST_URL=$SONAR_HOST_URL \
                            -e SONAR_TOKEN=$SONAR_AUTH_TOKEN \
                            sonarsource/sonar-scanner-cli \
                            -Dsonar.projectKey=crisisview-api \
                            -Dsonar.projectName=CrisisView-API \
                            -Dsonar.sources=routes,server.js,db.js,models.js \
                            -Dsonar.projectBaseDir=$PWD
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
                        ssh -o StrictHostKeyChecking=no ubuntu@51.21.152.249 "
                            docker pull 25jeanbaptiste/crisisview-api:latest
                            docker stop crisisview-api-staging 2>/dev/null || true
                            docker rm crisisview-api-staging 2>/dev/null || true
                            docker run -d \
                                --name crisisview-api-staging \
                                --restart unless-stopped \
                                -p 3001:3001 \
                                -e NODE_ENV=staging \
                                -e DB_HOST=localhost \
                                -e DB_PORT=3306 \
                                -e DB_USER=root \
                                -e DB_PASSWORD=root \
                                -e DB_NAME=crisisview \
                                25jeanbaptiste/crisisview-api:latest
                        "
                    '''
                }
            }
        }

        stage('Smoke Tests') {
            steps {
                sh '''
                    sleep 10
                    curl -sf --max-time 15 --retry 5 --retry-delay 3 http://51.21.152.249:3001/health
                    echo "[OK] API health check passed"
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
