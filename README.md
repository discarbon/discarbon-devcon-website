# discarbon-devcon-website
Frontend for offsetting devcon 6

The website can be accessed under `http://event-offset-dev.discarbon.earth/`. This directly reflects the main branch. This is in development so expect things to change and break. For development purposes, the smart contract running on the polygon chain sends all funds to an address we control. This will change once we get closer to the final version.


## How to develop

`npm i` to install all components

Should install tailwind CSS and Daisy UI for the UI components.

Open a console and start the tailwind css watcher which compiles the css automatically depending on the used components:

`npx tailwindcss -i ./css/input.css -o ./css/output.css --watch`

Run site for local development with HTTPS via [https-localhost](https://github.com/daquinoaldo/https-localhost):
```sh
npm i -g --only=prod https-localhost
sudo serve .
```
See [web3modal-vanilla-js-example][https://github.com/Web3Modal/web3modal-vanilla-js-example] for more info.


### List of airports

The list of airports is created by the python script `create_airport_list.py` in the resources folder. If you want to change anything there, edit the script and run it via:

`python3 ./resources/create_airport_list.py `


Start hacking.
