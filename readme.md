Sistema de Navegação Urbana – Docker

Este projeto contém frontend (Expo), backend (Node.js) e MySQL, todos executando via Docker Compose.

🚀 Como rodar o projeto

Instale Docker e Docker Compose.

Dentro da pasta do projeto, execute:

docker compose up --build


Isso irá iniciar:

Backend na porta 3000

MySQL na porta 3306

Frontend (Expo) com tunnel, mostrando um QR Code para rodar no celular

📱 IMPORTANTE – Alterar o IP para o professor

Somente um arquivo precisa ser alterado:

frontend/src/api.ts


Dentro dele existe:

export const EXPO_PUBLIC_API_URL = "http://SEU_IP_LOCAL:3000";


O professor só precisa colocar o IP da máquina dele (o IP da LAN), por exemplo:

export const EXPO_PUBLIC_API_URL = "http://192.168.0.25:3000";


📌 Esse é o único ajuste necessário.
O Docker já cuida de todo o resto.

📦 Tecnologias utilizadas

Node.js + Express (backend)

Expo + React Native (frontend)

MySQL 8

Docker e Docker Compose

Expo Tunnel (para carregar o app via QR Code)

📝 Observação

O frontend não roda via navegador, pois usa react-native-maps.
Por isso, o container inicia o Expo para gerar QR Code para celular.