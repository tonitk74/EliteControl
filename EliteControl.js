const FTMS_SERVICE = 0x1826;

// Fitness Machine Control Point
const FMCP_UUID = "00002ad9-0000-1000-8000-00805f9b34fb";
const BIKEDATA_UUID = "00002ad2-0000-1000-8000-00805f9b34fb";
let device = null;
let server = null;
let fmcp = null;
let bikeData = null;
let currentPower = 0;

const logDiv = document.getElementById("log");

function log(message) {
    console.log(message);

    const line = document.createElement("div");
    line.textContent = message;
    logDiv.appendChild(line);

    logDiv.scrollTop = logDiv.scrollHeight;
}

document
    .getElementById("connectBtn")
    .addEventListener("click", connectTrainer);

document
    .getElementById("requestControlBtn")
    .addEventListener("click", requestControl);

document
    .getElementById("releaseBtn")
    .addEventListener("click", releaseTrainer);

document
	.getElementById("startBtn")
	.addEventListener("click", startWorkout);
	
document
    .getElementById("power0Btn")
    .addEventListener(
        "click",
        () => setTargetPower(0)
    );
document
    .getElementById("power130Btn")
    .addEventListener(
        "click",
        () => setTargetPower(130)
    );
document
    .getElementById("power165Btn")
    .addEventListener(
        "click",
        () => setTargetPower(165)
    );
document
    .getElementById("power200Btn")
    .addEventListener(
        "click",
        () => setTargetPower(200)
    );
document
    .getElementById("powerUpBtn")
    .addEventListener(
        "click",
        () => setPowerUp(10)
    );
document
    .getElementById("powerDownBtn")
    .addEventListener(
        "click",
        () => setPowerDown(10)
    );

async function startWorkout() {

    try {

        const command =
            new Uint8Array([0x07]);

        await fmcp.writeValue(command);

        log("Start/Resume lähetetty");
    }
    catch (err) {

        log(`Virhe: ${err}`);
    }
}

async function setPowerUp(step)
{
	try {
		setTargetPower(currentPower + step);
	}
	catch(err) {
		log(`Virhe: ${err}`);
	}
}

async function setPowerDown(step)
{
	try {
		setTargetPower(currentPower - step);
	}
	catch(err) {
		log(`Virhe: ${err}`);
	}
	
}
async function setTargetPower(power) {

    try {

        const command = new Uint8Array([
            0x05,
            power & 0xFF,
            (power >> 8) & 0xFF
        ]);

        await fmcp.writeValue(command);

        log(`Set Target Power ${power} W lähetetty`);
		log(`${currentPower}W -> ${power}W`);
		currentPower = power;
		
    }
    catch (err) {

        log(`Virhe: ${err}`);
    }
}

async function connectTrainer() {

    try {

        log("Etsitään Bluetooth-laitteita...");
        device = await navigator.bluetooth.requestDevice({
            filters: [
                { services: [FTMS_SERVICE] }
            ]
        });
        log(`Laite: ${device.name}`);
		device.addEventListener(
			"gattserverdisconnected",
			() => {

				log("Trainer disconnected");

				fmcp = null;
				bikeData = null;
				server = null;
				device = null;

				document.getElementById("requestControlBtn").disabled = true;
				document.getElementById("releaseBtn").disabled = true;
				document.getElementById("startBtn").disabled = true;
			}
		);

        server = await device.gatt.connect();
        log("Yhdistetty GATT-palvelimeen");

        const service = await server.getPrimaryService(FTMS_SERVICE);
        log("FTMS-palvelu löydetty");

		fmcp = await service.getCharacteristic(FMCP_UUID);
		await fmcp.startNotifications();
		fmcp.addEventListener(
			"characteristicvaluechanged",
			event => {

				const data =
					new Uint8Array(event.target.value.buffer);

				console.log("FMCP RX:", data);
			}
		);
		log("FMCP indications aktivoitu");

/*		bikeData = await service.getCharacteristic(BIKEDATA_UUID);
		await bikeData.startNotifications();
		bikeData.addEventListener(
			"characteristicvaluechanged",
			event => {

				const data =
					new Uint8Array(event.target.value.buffer);

				console.log("Bike Data:", data);
			}
		);
		log("BIKEDATA aktivoitu");
*/
        document
            .getElementById("requestControlBtn")
            .disabled = false;
		
		document
			.getElementById("releaseBtn")
			.disabled = false;

    }
    catch (err) {
        log(`Virhe: ${err}`);
    }
}

async function requestControl() {

    if (!fmcp) {
        log("FMCP ei käytettävissä");
        return;
    }

    try {

        // FTMS opcode 0x00 = Request Control
        const command = new Uint8Array([0x00]);

        await fmcp.writeValue(command);
		log("Request Control lähetetty");

		document
			.getElementById("startBtn")
			.disabled = false;
		document
			.getElementById("power0Btn")
			.disabled = false;
		document
			.getElementById("power130Btn")
			.disabled = false;
		document
			.getElementById("power165Btn")
			.disabled = false;
		document
			.getElementById("power200Btn")
			.disabled = false;
		document
            .getElementById("powerUpBtn")
            .disabled = false;
		document
            .getElementById("powerDownBtn")
            .disabled = false;
    }
    catch (err) {
        log(`Virhe: ${err}`);
    }
}

async function releaseTrainer() {

    try {

        if (fmcp) {

            log("Lähetetään Reset...");

            // FTMS Reset
            await fmcp.writeValue(
                new Uint8Array([0x01])
            );

            await new Promise(resolve =>
                setTimeout(resolve, 500)
            );

            await fmcp.stopNotifications();
            log("FMCP notifications pysäytetty");
        }

		if (bikeData) {
			await bikeData.stopNotifications();
			log("BikeData notifications pysäytetty");
		}

        if (server && server.connected) {

            server.disconnect();

            log("Bluetooth-yhteys katkaistu");
        }

        fmcp = null;
        server = null;
        device = null;
		bikeData = null;
		
        document
            .getElementById("requestControlBtn")
            .disabled = true;

        document
            .getElementById("releaseBtn")
            .disabled = true;
			
		
		document
			.getElementById("startBtn")
			.disabled = true;
		document
			.getElementById("power0Btn")
			.disabled = true;
		document
			.getElementById("power130Btn")
			.disabled = true;
		document
			.getElementById("power165Btn")
			.disabled = true;
		document
            .getElementById("power200Btn")
            .disabled = true;
		document
            .getElementById("powerUpBtn")
            .disabled = true;
		document
            .getElementById("powerDownBtn")
            .disabled = true;
    }
    catch (err) {

        log(`Release virhe: ${err}`);
    }
}