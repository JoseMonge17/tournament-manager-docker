**L1 - Docker**

Instituto Tecnológico de Costa Rica

Campus Tecnológico Central Cartago

Escuela de Ingeniería en Computación

II Semestre 2024

Profesor Diego Mora

Carlos José Ávalos Mendieta

Carné: 2024207640

José Julián Monge Brenes

Carné: 2024247024

Allan Chan

Carné: 

Daniel Sequeira

Carné: 

Fecha de entrega: 2 de setiembre del 2025


# Taller paso a paso
## Descargamos los repositorios
Descargamos los repositorios de github, en su última versión, vamos a tener un repositorio de la siguiente manera:
```
tournament-manager/
│── tournament-api
│   ├── Dockerfile
│   └── docker-compose.yml
│
└── tournament-ui/
    ├── Dockerfile
    └── docker-compose.yml

```

## Compilar las imagenes
### API
Nos movemos a la carpeta del api, y compilamos las imágenes mediante el siguiente comando:

```cmd
docker-compose build
```

Este comando hará dos cosas:
1. Descarga la imagen de mongo
2. Compila la aplicación del api

## UI
Nos movemos a la carpeta del ui.

```cmd
docker-compose build
```

Este comando hará dos cosas:
1. Compila la aplicación del IO

## Verificamos
En este momento, podemos realizar una verificación con el comando `docker container ls` y debemos tener 3 imágenes.

# Subir las aplicaciones
En las carpetas de UI y API podemos subir las aplicaciones utilizando el comando
```
docker-compose up
```

El UI estará expuesto en el puerto 80 y el api en el 3000.

## Incluímos datos
Tomamos datos del archivo `data.ts` y utilizando Postman para insertar los datos en la base de datos.  Tenemos que importar el archivo `docs/Tournament.postman_collection.json`.

Posteriormente, enviamos la solicitud de `Create Tournament` para tener datos en la basde de datos.
Podemos verificar estos datos entrando a mongo directamente desde el pod o utilizando la solicitud de `Fetch Tournaments`.

#Lo que realizamos nosotros

## Red Compartida
Creamos una red compartida por si no existe, la cual es internal_net, para que todos los contenedores se vean, se modificaron los .yml para que se usará como una conexión externa
```cmd
docker network create internal_net
```

##Kafka + Zookeeper
Archivo: docker-compose.kafka.yml
Archivo el cual está en la raiz de la carpeta principal
(Usando imágenes Confluent; ambos en internal_net.)

```cmd
docker compose -f docker-compose.kafka.yml up -d
```

##Se agregó una variable de entorno a los .yml de la API

```yaml
- KAFKA_BROKER=kafka:9092
```

##Se realizó un rebuild de la imagen
```cmd
cd ../tournament-api
docker compose build
docker compose up -d
```
#Se creó el job consumidor
Estructura: tournament-job/ con Dockerfile, package.json, index.js.

##Comandos para levantar el job
```cmd
docker compose -f docker-compose.job.yml up -d --build
```


##Comandos para revisar los logs del job y ver si está escuchando y desencolando el kafka
```cmd
docker logs -f tournament-job
```

# Probar el endpoint Post/Registrar
URL: http://localhost:3000/registrar

##Verificar que todos los contenedores estén up
```cmd
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

Ahora al probar el endpoint POST/registrar, se deberia registrar el torneo, comprobrar con fetch-tournament y en los logs del job debe aparecer una nueva partición así:
```cmd
[partition 0] key=68b67fa6cadb126a49733168
{"_id":"68b67fa6cadb126a49733168","title":"Job Test Cup","type":"soccer","roster":[{"id":1,"name":"Ana","weight":60,"age":22,"_id":"68b67fa6cadb126a49733169"},{"id":2,"name":"Luis","weight":75,"age":24,"_id":"68b67fa6cadb126a4973316a"}],"createdAt":"2025-09-02T05:24:54.793Z"}
```
