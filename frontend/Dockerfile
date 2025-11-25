FROM node:18

RUN apt-get update && apt-get install -y git watchman && apt-get clean

WORKDIR /app

COPY package*.json ./
RUN npm install

RUN npm install -g @expo/ngrok

COPY . .

ENV EXPO_NO_INTERACTIVE=1

EXPOSE 19000
EXPOSE 19001
EXPOSE 19002

CMD ["npx", "expo", "start", "--tunnel", "--no-dev", "--clear"]
