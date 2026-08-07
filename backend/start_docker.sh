#!/bin/bash
cd /home/rs/docker/AssettoServer
# Démarrer docker-compose. Les logs s'afficheront dans la sortie standard et seront captés par le backend Go.
exec docker-compose up
