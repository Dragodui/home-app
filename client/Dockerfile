FROM node:18-apline

RUN apk add --no-cache git bash
RUN npm install -g expo-cli

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 8081 19000 19001 19002

CMD ["npx", "expo", "start", "--tunnel"]