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
                        docker run --rm \
                            --network jenkins-net \
                            -v "$PWD:/usr/src" \
                            --user root \
                            sonarsource/sonar-scanner-cli \
                            -Dsonar.projectKey=crisisview-api \
                            -Dsonar.projectName="CrisisView API" \
                            -Dsonar.sources=. \
                            -Dsonar.exclusions="**/node_modules/**,**/__tests__/**,**/coverage/**,**/migration.js,**/seed.js,.scannerwork/**" \
                            -Dsonar.javascript.lcov.reportPaths=coverage/lcov.info \
                            -Dsonar.host.url=$SONAR_HOST_URL \
                            -Dsonar.login=$SONAR_AUTH_TOKEN
                        cp /tmp/.scannerwork/report-task.txt . 2>/dev/null || true
                    '''
                }
            }
        }

        stage('Quality Gate') {
            steps {
                timeout(time: 3, unit: 'MINUTES') {
                    waitForQualityGate abortPipeline: false
                }
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
                    docker run --rm \
                        -v /var/run/docker.sock:/var/run/docker.sock \
                        -v "$PWD:/project" \
                        aquasec/trivy:latest image \
                        --format json \
                        --output /project/reports/security/trivy-image.json \
                        ${IMAGE_NAME}:${IMAGE_TAG} || true
                '''
            }
            post {
                always {
                    archiveArtifacts allowEmptyArchive: true,
                        artifacts: 'reports/security/trivy-image.json'
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
                    chmod +x scripts/smoke-test.sh
                    ./scripts/smoke-test.sh
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
