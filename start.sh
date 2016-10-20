(cd ./server ; nodemon server.js ) &
(cd ./client ; ln teamdraw.html index.html ; http-server -o -p 8899 ; rm index.html) &
@echo "waiting"
wait