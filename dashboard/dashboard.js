
const ZONE1_PATH = "zones/zone1";
const ZONE2_PATH = "zones/zone2";
// const ZONE3_PATH = "zones/zone3";
// const ZONE4_PATH = "zones/zone4";

//configure optimal humidity and temperature here
const optimalHumidity = 40;
const optimalTemperature = 26;

document.addEventListener('DOMContentLoaded', function() {
    console.log('Dashboard initialized');
    listenToZone(1, ZONE1_PATH);
    listenToZone(2, ZONE2_PATH);
    evaluateZoneStatus(1, ZONE1_PATH);
    evaluateZoneStatus(2, ZONE2_PATH);
});


function listenToZone(zoneNumber, zonePath) {
    const zoneRef = database.ref(zonePath);
    
    zoneRef.on('value', (snapshot) => {
        const data = snapshot.val();
        
        console.log("Zone"+zoneNumber+" data:", data);
        
        if (data) {
            // Update humidity
            const humidityElement = document.getElementById("zone"+zoneNumber+"-humidity");
            if (humidityElement && data.humidity !== undefined) {
                humidityElement.textContent = data.humidity + '%';
            }
            
            // Update temperature
            const tempElement = document.getElementById("zone"+zoneNumber+"-tempreature");
            if (tempElement && data.temperature !== undefined) {
                tempElement.textContent = data.temperature + '°C';
            }
        }
        const zoneStatus = evaluateZoneStatus(data);
        changeZoneStatusColor(zoneNumber, zoneStatus);
    });
}

function evaluateZoneStatus(data) {
    //Take the input as data
    if(data.humidity <optimalHumidity && data.temperature > optimalTemperature) { //get humidity and temperature from data and check if it is less than 50 and greater than 26
        return "critical";
    }else if(data.humidity < optimalHumidity) { //get humidity from data and check if it is less than 50
        return "warning";
    }else  if(data.temperature > optimalTemperature) { //get temperature from data
        return "warning";
    } else {
        return "healthy";
    }
}



function changeZoneStatusColor(zoneNumber, zoneStatus) {
      // 1. Find the zone card by data-zone attribute
      const zoneCard = document.querySelector(`[data-zone= "${zoneNumber}"]`);
    
      if (zoneCard) {
          // 2. Remove ALL status classes
          zoneCard.classList.remove('healthy', 'warning', 'critical');
          
          // 3. Add the NEW status class
          zoneCard.classList.add(zoneStatus);
          
          console.log(`✅ Zone ${zoneNumber} class changed to: ${zoneStatus}`);
          
          // 4. Update the status badge text
          const statusBadge = zoneCard.querySelector('.zone-status');
          if (statusBadge) {
              statusBadge.textContent = zoneStatus.charAt(0).toUpperCase() + zoneStatus.slice(1);
          }
      }else{
        console.log("Zone card "+ zoneNumber+" not found");
      }
}


