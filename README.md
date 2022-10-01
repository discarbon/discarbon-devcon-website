# discarbon-devcon-website
Frontend for offsetting devcon 6

The website can be accessed under `http://event-offset-dev.discarbon.earth/`. This directly reflects the main branch. This is in development so expect things to change and break. For development purposes, the smart contract running on the polygon chain sends all funds to an address we control. This will change once we get closer to the final version.


## How to develop

`npm i` to install all components

Should install tailwind CSS and Daisy UI for the UI components.

Open a console and start the tailwind css watcher which compiles the css automatically depending on the used components:

`npx tailwindcss -i ./src/css/input.css -o ./src/css/output.css --watch`

We use parcel to develop the site:
run
`npm run start` to continuously build and start a webserver on http://localhost:1234

The webserver seems to work with web3modal and walletconnect even though it is not https.

Before commiting use the following command to bundle the website:

`npm run build`

And commit all the files in the /dist/ folder.


If the site fails in unexplainable ways, use the following:

Run site for local development with HTTPS via [https-localhost](https://github.com/daquinoaldo/https-localhost):
```sh
sudo npm i -g --only=prod https-localhost
sudo serve /dist/
```
It can then be connected to https://localhost:443

Without HTTPS Walletconnect will fail in weird ways.

See [web3modal-vanilla-js-example][https://github.com/Web3Modal/web3modal-vanilla-js-example] for more info.



### List of airports

The list of airports is created by the python script `create_airport_list.py` in the resources folder. If you want to change anything there, edit the script and run it via:

`python3 ./resources/create_airport_list.py`


Start hacking.
