# Node.js 이미지를 베이스로 설정
FROM node:14

# 작업 디렉토리 설정
WORKDIR /app

# 앱 의존성 설치
COPY package*.json ./
RUN npm install

# 앱 소스 복사
COPY . .

# 환경 변수 파일 복사
COPY .env .env

# 애플리케이션 실행
CMD ["node", "index.js"]
