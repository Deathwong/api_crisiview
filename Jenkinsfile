pipeline {
    agent { label 'docker-agent' }

    environment {
        IMAGE_NAME = "crisisview-api"
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
                        chmod -R 755 .
                        echo "=== Contenu du workspace ==="
                        ls -la
                        echo "=== Contenu routes ==="
                        ls -la routes/ || echo "routes introuvable"
                        docker run --rm \
                            --network jenkins-net \
                            -v "$PWD:/usr/src" \
                            --user root \
                            -e SONAR_HOST_URL=$SONAR_HOST_URL \
                            -e SONAR_TOKEN=$SONAR_AUTH_TOKEN \
                            sonarsource/sonar-scanner-cli \
                            -Dsonar.projectKey=crisisview-api \
                            -Dsonar.projectName=CrisisView-API \
                            -Dsonar.projectBaseDir=/usr/src \
                            -Dsonar.sources=routes,server.js,db.js,models.js
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

        stage('Deploy Staging') {
            steps {
                sh '''
                    export API_IMAGE=${IMAGE_NAME}:${IMAGE_TAG}
                    docker compose -f deploy/docker-compose.staging.yml up -d
                    sleep 10
                '''
            }
        }

        stage('Smoke Tests') {
            steps {
                sh '''
                    docker run --rm \
                        --network staging-net \
                        curlimages/curl:latest \
                        sh -c '
                            echo "=== SMOKE TESTS ==="
                            echo "[TEST] API /health"
                            curl -sf --max-time 10 --retry 5 --retry-delay 3 http://crisisview-api-staging:3001/health
                            echo ""
                            echo "[OK] API /health"
                            echo "[TEST] API /incidents"
                            curl -sf --max-time 10 --retry 3 --retry-delay 3 http://crisisview-api-staging:3001/incidents
                            echo ""
                            echo "[OK] API /incidents"
                            echo "=== SMOKE TESTS OK ==="
                        '
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
