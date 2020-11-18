window.buffer = [];
window.currentStatus = {};
window.previousStatus = {};
window.baudrate = 115200;
window.writeTimer = undefined;

var logDiv = document.getElementById("log");
var outputDiv = document.getElementById("output");

if ("serial" in navigator) {
  // log("The Serial API is supported.");
} else {
  log("The Serial API is NOT supported.");
  log("enable this first")
  log("chrome://flags#enable-experimental-web-platform-features")
}
autoConnect();


// set up write timer to keep polling for data
function setWriteTimer(timeout) {
  if (timeout == undefined) { timeout = 1000; }
  if (window.writeTimer != undefined) { clearTimeout(window.writeTimer); }
  window.writeTimer = setTimeout(function() { writeserial(); }, timeout);
}


async function autoConnect() {
  // get previously granted ports
  const ports = await navigator.serial.getPorts();
  if (ports.length == 1) {
    log("Found 1 port which was previously granted access, trying to auto reconnect");
    window.port = ports[0];
    await port.open({ baudRate: window.baudrate, baudrate: window.baudrate }); // twice due to change in recent chrome version
    readloop();
    setWriteTimer();
  } else if (ports.length > 1) {
    log("More than 1 port previously granted access, don't know which to use.");
  } else {
    log("No ports which are already granted, can't auto connect");
  }
}


function log(message) {
    // logDiv.innerText = message + "\n" + logDiv.innerText;
    console.log(message);
}


async function connect() {
  // optional filter down to arduino mega, or whatever,
  // at least in linux it hides all the ttys
  const filters = [
    { usbVendorId: 0x2341, usbProductId: 0x0042 } // arduino mega
  ];
  window.port = await navigator.serial.requestPort({ filters });
  await port.open({ baudRate: window.baudrate, baudrate: window.baudrate }); // twice due to change in recent chrome version
  readloop();
  setWriteTimer();
}


async function writeserial() {
  setWriteTimer(5000); // set timer for 5 seconds in case this fails or parsing fails
  // console.log("in writeserial");
  const writer = port.writable.getWriter();
  const data = new Uint8Array([0x41]); // "A" - requests live data packet
  await writer.write(data);
  writer.releaseLock(); // Allow the serial port to be closed later.
}


async function readloop() {
  const reader = port.readable.getReader();
  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      reader.releaseLock();
      break;
    }
    // console.log(value);
    for (i=0; i<value.length; i++) {
      window.buffer.push(value[i]);
    }
    parseBuffer();
  }
  await reader.cancel(); // Force reader.read() to resolve immediately and subsequently call reader.releaseLock() in the loop example above.
  await port.close();
}

function parseBuffer() {
  if (window.buffer.length < 117) {
    // log("need more data");
    return;
  } else if (window.buffer.length > 117) {
    log("got too much data");
    window.buffer = [];
    return;
  }
  window.lastEcuDataReceived = Date.now()/1000;
  // log("got the right amount of data, going to parse it");

  // previousStatus = currentStatus; // causes a pointer copy, don't use this, do the following full copy
  for (var i in currentStatus) { previousStatus[i] = currentStatus[i]; }

  currentStatus.secl = window.buffer[0]; //secl is simply a counter that increments each second. Used to track unexpected resets (Which will reset this count to 0)
  currentStatus.status1 = window.buffer[1]; //status1 Bitfield
  currentStatus.engine = window.buffer[2]; //Engine Status Bitfield
  currentStatus.syncLossCounter = window.buffer[3];

  currentStatus.map = (window.buffer[5] << 8) + window.buffer[4];

  currentStatus.iat = window.buffer[6]; //mat
  currentStatus.coolant = window.buffer[7]; //Coolant ADC
  currentStatus.batCorrection = window.buffer[8]; //Battery voltage correction (%)
  currentStatus.battery = window.buffer[9]; //battery voltage (was currentStatus.battery10)
  currentStatus.o2 = window.buffer[10]; //O2
  currentStatus.egoCorrection = window.buffer[11]; //Exhaust gas correction (%)
  currentStatus.iatCorrection = window.buffer[12]; //Air temperature Correction (%)
  currentStatus.wueCorrection = window.buffer[13]; //Warmup enrichment (%)

  currentStatus.rpm = (window.buffer[15] << 8) + window.buffer[14];

  currentStatus.aeamount = window.buffer[16] << 1; //TPS acceleration enrichment (%) divided by 2 (Can exceed 255) (was (byte)(currentStatus.AEamount >> 1))

  currentStatus.corrections = (window.buffer[18] << 8) + window.buffer[17]; //Total GammaE (%)

  currentStatus.ve1 = window.buffer[19]; //VE 1 (%)
  currentStatus.ve2 = window.buffer[20]; //VE 2 (%)
  currentStatus.afrTarget = window.buffer[21];
  currentStatus.tpsDOT = window.buffer[22]; //TPS DOT
  currentStatus.advance = window.buffer[23];
  currentStatus.tps = window.buffer[24]; // TPS (0% to 100%)

  currentStatus.loopsPerSecond = (window.buffer[26] << 8) + window.buffer[25]

  currentStatus.freeRAM = (window.buffer[28] << 8) + window.buffer[27];

  currentStatus.boostTarget = window.buffer[29] << 1; // = (byte)(currentStatus.boostTarget >> 1); //Divide boost target by 2 to fit in a byte
  currentStatus.boostDuty = window.buffer[30]; // = (byte)(currentStatus.boostDuty / 100);

  currentStatus.spark = window.buffer[31]; //Spark related bitfield

  currentStatus.rpmDOT = (window.buffer[33] << 8) + window.buffer[32]; // original comment: //rpmDOT must be sent as a signed integer

  currentStatus.ethanolPct = window.buffer[34]; //Flex sensor value (or 0 if not used)
  currentStatus.flexCorrection = window.buffer[35]; //Flex fuel correction (% above or below 100)
  currentStatus.flexIgnCorrection = window.buffer[36]; //Ignition correction (Increased degrees of advance) for flex fuel
  currentStatus.idleLoad = window.buffer[37];
  currentStatus.testOutputs = window.buffer[38];
  currentStatus.o2_2 = window.buffer[39]; //O2
  currentStatus.baro = window.buffer[40]; //Barometer value

  currentStatus.canin = [];
  currentStatus.canin[0] = (window.buffer[42] << 8) + window.buffer[41];
  currentStatus.canin[1] = (window.buffer[44] << 8) + window.buffer[43];
  currentStatus.canin[2] = (window.buffer[46] << 8) + window.buffer[45];
  currentStatus.canin[3] = (window.buffer[48] << 8) + window.buffer[47];
  currentStatus.canin[4] = (window.buffer[50] << 8) + window.buffer[49];
  currentStatus.canin[5] = (window.buffer[52] << 8) + window.buffer[51];
  currentStatus.canin[6] = (window.buffer[54] << 8) + window.buffer[53];
  currentStatus.canin[7] = (window.buffer[56] << 8) + window.buffer[55];
  currentStatus.canin[8] = (window.buffer[58] << 8) + window.buffer[57];
  currentStatus.canin[9] = (window.buffer[60] << 8) + window.buffer[59];
  currentStatus.canin[10] = (window.buffer[62] << 8) + window.buffer[61];
  currentStatus.canin[11] = (window.buffer[64] << 8) + window.buffer[63];
  currentStatus.canin[12] = (window.buffer[66] << 8) + window.buffer[65];
  currentStatus.canin[13] = (window.buffer[68] << 8) + window.buffer[67];
  currentStatus.canin[14] = (window.buffer[70] << 8) + window.buffer[69];
  currentStatus.canin[15] = (window.buffer[72] << 8) + window.buffer[71];

  currentStatus.tpsADC = window.buffer[73];
  currentStatus.getNextError = window.buffer[74]; // = getNextError();
  currentStatus.pw1 = (window.buffer[76] << 8) + window.buffer[75]; //Pulsewidth 1 multiplied by 10 in ms. Have to convert from uS to mS.
  currentStatus.pw2 = (window.buffer[78] << 8) + window.buffer[77]; //Pulsewidth 2 multiplied by 10 in ms. Have to convert from uS to mS.
  currentStatus.pw3 = (window.buffer[80] << 8) + window.buffer[79]; //Pulsewidth 3 multiplied by 10 in ms. Have to convert from uS to mS.
  currentStatus.pw4 = (window.buffer[82] << 8) + window.buffer[81]; //Pulsewidth 4 multiplied by 10 in ms. Have to convert from uS to mS.
  currentStatus.status3 = window.buffer[83];
  currentStatus.engineProtectStatus = window.buffer[84];
  currentStatus.fuelLoad = (window.buffer[86] << 8) + window.buffer[85];
  currentStatus.ignLoad = (window.buffer[88] << 8) + window.buffer[87];
  currentStatus.dwell = (window.buffer[90] << 8) + window.buffer[89];
  currentStatus.cliIdleTarget = window.buffer[91];
  currentStatus.mapDOT = window.buffer[92];
  currentStatus.vvt1Angle = window.buffer[93];
  currentStatus.vvt1TargetAngle = window.buffer[94];
  currentStatus.vvt1Duty = window.buffer[95];
  currentStatus.flexBoostCorrection = (window.buffer[97] << 8) + window.buffer[96];
  currentStatus.baroCorrection = window.buffer[98];
  currentStatus.ve = window.buffer[99]; //Current VE (%). Can be equal to VE1 or VE2 or a calculated value from both of them
  currentStatus.aseValue = window.buffer[100]; //Current ASE (%)
  currentStatus.vss = (window.buffer[102] << 8) + window.buffer[101];
  currentStatus.gear = window.buffer[103];
  currentStatus.fuelPressure = window.buffer[104];
  currentStatus.oilPressure = window.buffer[105];
  currentStatus.wmiPW = window.buffer[106];
  currentStatus.wmiEmpty = window.buffer[107];
  currentStatus.vvt2Angle = window.buffer[108];
  currentStatus.vvt2TargetAngle = window.buffer[109];
  currentStatus.vvt2Duty = window.buffer[110];
  currentStatus.outputsStatus = window.buffer[111];
  currentStatus.fuelTemp = window.buffer[112]; //Fuel temperature from flex sensor
  currentStatus.fuelTempCorrection = window.buffer[113]; //Fuel temperature Correction (%)
  currentStatus.advance1 = window.buffer[114]; //advance 1 (%)
  currentStatus.advance2 = window.buffer[115]; //advance 2 (%)
  // window.buffer[116] = 0; //Currently unused

  // console.log(currentStatus);
  window.buffer = [];

  // updateOutputsRawText();
  updateOutputsCustom();

  setWriteTimer(100); // drop the previous 5 seconds timer to this
  // console.log("parsed");
}

function updateOutputsCustom() {
  for (key in currentStatus) {
    if (previousStatus[key] === currentStatus[key]) {
      continue;
    }
    // dynamic method call for each data item
    // e.g. for currentStatus.rpm it will try to call updateOutput_rpm();
    if (window["updateOutput_"+key] != undefined) {
      window["updateOutput_"+key](currentStatus[key]);
    }
  }
}

function updateOutputsRawText() {
  for (key in currentStatus) {
    if (previousStatus[key] === currentStatus[key]) {
      continue;
    }
    thisOutputDiv = document.getElementById("output_"+key);
    if (thisOutputDiv == undefined) {
      thisOutputDiv = document.createElement("div");
      thisOutputDiv.id = "output_"+key;
      outputDiv.appendChild(thisOutputDiv);
    }
    thisOutputDiv.innerText = key + " " + currentStatus[key];
  }
}

function updateOutput_rpm() {
  console.log("updateOutput_rpm called");
  // e.g. update RPM gauge needle here
}

function testdata() {
  // 117 bytes like the speeduinos return
  window.buffer = [
    0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0
  ];
  parseBuffer();
}
