
function newwebsocket() {
  url = 'ws://localhost:8080/ws';
  window.c = new WebSocket(url);

  c.onmessage = function(msg){
    // $("#output").prepend((new Date())+ " <== "+msg.data+"\n")
    // console.log(msg)
    window.counter++;
    try {
      data = JSON.parse(msg.data);
      // console.log(data);
      wsParse(data);
      window.parsedCounter++;
    } catch(err) {
      console.log("failed parsing");
    }
    // console.log(data);

    // put some delay in before next data so we don't run 100%, for CPU/heat mostly
    // also fastest CPU puts out data is 50hz/20ms anyway
    setTimeout(function() { requestData(); }, window.messageDelay);
  }

  c.onopen = function(){
    requestData();
  }

  c.onerror = function(){
    console.log("WEBSOCKET ERROR, will make a new connection");
    c.close()
  }

  c.onclose = function(){
    console.log("WEBSOCKET closed");
    setTimeout(function(){ newwebsocket(); }, 1000 );
  }

  // send = function(data){
  //   $("#output").prepend((new Date())+ " ==> "+data+"\n")
  //   c.send(data)
  // }
}
newwebsocket();

function requestData() {
  c.send("."); // fast as possible
}

function wsParse(data) {
  for (key in data) {
    var value = data[key];

    // dont repeatedly set the same value
    if (window.lastSeen[key] == value) {
      continue;
    }

    // it must be new data
    window.lastSeen[key] = value;

    if (key == "rpm") {
      setRpmNeedle(value);

    } else if (key == "mil_status") {
      setMil(value);
    } else if (key == "battery_voltage") {
      setBattery(value.toFixed(1));
    } else if (key == "air_temp") {
      setIat(value.toFixed(1));
    } else if (key == "coolant_temp") {
      setCoolant(value.toFixed(1));
    } else if (key == "cooling_fan_1_output") {
      setFan1On(value);
    } else if (key == "fuel_pump_status") {
      setFuelPumpOn(value);

    } else if (key == "lambda_measured") {
      setAfr((value*14.7).toFixed(2));
    } else if (key == "target_lambda") {
      setTargetAfr((value*14.7).toFixed(2));
    } else if (key == "map_mbar") {
      setMapPressures(value.toFixed(0));
    } else if (key == "barometric_pressure_bar") {
      setBaro((value*1000).toFixed(0));
    } else if (key == "scaled_tps") {
      setTps(value.toFixed(1));
    } else if (key == "final_spark_advance") {
      setSparkAdv(value.toFixed(2));


    } else if (key == "gear_ratio") {
      setGear(value);

    } else if (key == "wheel_speed_mph") {
      setMph(value);

    } else if (key == "last_ecu_data_received") {
      window.lastEcuDataReceived = value;
    }

  }
}

// not used now, ws is instead
// function getData(filename, delay) {
//   fetch(filename, {cache: "no-store"})
//   .then(
//     function(response) {
//       if (response.status !== 200) {
//         throw("bad http response");
//       }
//       dataParse(response, filename, delay);
//     }
//   )
//   .catch(function(err) {
//     window.setTimeout(getData, 500, filename, delay);
//   });
// }
