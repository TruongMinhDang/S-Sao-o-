env:
  - variable: APP_SOSAODO_ID
    secret: firebase-project-id
  - variable: APP_SOSAODO_EMAIL
    secret: FIREBASE_CLIENT_EMAIL
  - variable: APP_SOSAODO_KEY
    secret: FIREBASE_PRIVATE_KEY

runConfig:
  cpu: 1
  memoryMiB: 512