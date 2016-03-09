/*
DESCENSION ITEM ROLLER APP
Version: 1.2
Author: Matt Cardinal
Description: A simple webapp which handles item rolling for Descension.
  Stores item and most probability information in a JSON file accessed by
  http request, handles logic with javascript, uses css for style and html
  to show content.
Files: roller.js, roller.css, rollJSON.txt, index.html, blaklowtuz.ico
Version Notes (1.2.1):
  * Added class information to log
  * Added "clear last" button to delete the previous entry
Version Notes (1.2):
  *Fixed rare bug causing only "Crystal Barrier (Green)" to show when choosing offhand
  *Implemented Log function: stores the rolled items for the current browser session
*/

// most of these global variables should be moved into the functions themselves.
curState = 0;
character = {class: "delver", tier: "tier6", kind:"none", equipment:"Crystal Barrier (Red)", special: "", magic: "", stat: ""};
output = "";
itemType = "";
count = 0;
setCount = 0;

function xmlRequests () {
  //this runs on load, so it's part wrapper and part xml request.  should probably be split into two.
  document.getElementById("rollButton").className = "enabled";
  document.getElementById("rollButton").disabled = false;
  document.getElementById("class").className = "enabled";
  document.getElementById("tier").className = "enabled";
  document.getElementById("class").disabled = false;
  document.getElementById("tier").disabled = false;
  document.getElementById("result").innerHTML = "Congratulations, adventurer! Roll your item!";
  curState = 0;
  var tableRequest = new XMLHttpRequest();
  var url = "rollJSON.txt";
  tableRequest.onreadystatechange = function() {
      if (tableRequest.readyState == 4 && tableRequest.status == 200) {
          masterTable = JSON.parse(tableRequest.responseText);
          classObj = masterTable.classes;
          magicObj = masterTable.magic;
          storeList = masterTable.store;
          specialList = masterTable.special;
          if(!localStorage["lastlog"]){
          localStorage["lastlog"] = "";
          }
          document.getElementById("logContent").innerHTML = localStorage["lastlog"];
          count = document.querySelectorAll("#logContent > button").length;
          setCount = setCheck();
          if (setCount > 0){
            document.getElementById("logMarkSet").className = "enabled";
            document.getElementById("logMarkSet").disabled = false;
          }
          var i = 1;
          while (i <= count){
            handleButton(i);
            i++;
          }
      }
  };
  tableRequest.open("GET", url, true);
  tableRequest.send();
}

function setCheck(){
  var logString = document.getElementById("logContent").innerHTML;
  var curMatch = 0;
  var lastMatch = 0;
  var tempSetCount = 0;
  do {
    curMatch = logString.indexOf("<!--New Set-->", lastMatch+1);
    tempSetCount +=1;
    if (curMatch == -1){
      if (lastMatch = 0){
      tempSetCount = 0;
      }
    }
    lastMatch = curMatch;
  } while(curMatch != -1);
  return tempSetCount;
}

function storeCheck(){
  //returns true 1/4 of the time
  check = roll4();
  if (check != 4){
    return true;
  } else {
    return false;
  }
}

function typeItem(){
  //returns item type depending on the result of a d20 roll
  //may require modification for new store list
  var roll = roll20();
  var typeTable = masterTable.types;
  for (type in typeTable){
    if (roll <= typeTable[type][0]){
      return typeTable[type][1];
    }
  }

}
function clearLogAll(){
  //replaces all log data with an empty string
  count = 0;
  setCount = 0;
  document.getElementById("logMarkSet").disabled = true;
  document.getElementById("logMarkSet").className = "disabled";
  document.getElementById("logContent").innerHTML = "";
  localStorage["lastlog"] = document.getElementById("logContent").innerHTML;
}

function clearLogLast(){
  //finds the location of the last "<!--New Entry-->" in the log, sets log to substring
  //up to that point. If it finds none, it replaces the log with an empty string
  var logString = document.getElementById("logContent").innerHTML;
  var lastMatch = 0;
  var curMatch = 0;
  do {
    curMatch = logString.indexOf("<!--New Entry-->", lastMatch+1);
    quickMatch = logString.indexOf("<!--New Set-->", lastMatch+1);
    if (quickMatch > curMatch){
      curMatch = quickMatch;
    }
    if (curMatch == -1){
      if (logString.substring(lastMatch).indexOf("<button") != -1){
        count -= 1;
      }
      if (logString.substring(lastMatch).indexOf("<!--New Set-->") != -1){
        setCount -= 1;
        if (setCount <= 0) {
          document.getElementById("logMarkSet").disabled = true;
          document.getElementById("logMarkSet").className = "disabled";
        }
      }
      if (lastMatch == 0){
      document.getElementById("logContent").innerHTML = "";
      } else {
      document.getElementById("logContent").innerHTML = logString.substring(0, lastMatch);
      }
    }
    lastMatch = curMatch;
  } while(curMatch != -1);
  for (i=1;i<=count;i++){
    handleButton(i);
  }
  localStorage["lastlog"] = document.getElementById("logContent").innerHTML;
}

function firstRoll(variable){
  /* This is a recursive function. It saves its own state in curState, and runs
  itself with various inputs depending on the state. Most of the generated
  attributes are saved in the "character" object. The function should probably
  be modified so that curState is passed to the function, rather than being a
  global variable.*/
  document.getElementById("result").innerHTML = "";
  document.getElementById("stat").innerHTML = "";
  if (curState == 0) {
    //clears the character object
    character.special = "";
    character.equipment = "";
    character.stat = "";
    output = "";
    //get the tier level and class from the select elements in index.html
    var dropDown = document.getElementById("tier");
    character.tier = dropDown.options[dropDown.selectedIndex].id;
    dropDown = document.getElementById("class");
    character.class = dropDown.options[dropDown.selectedIndex].id;
    //check if the item is a store item, set character.store to boolean
    character.store = storeCheck();
    //roll on a series of tables to determine item type, return string or object
    itemType = typeItem();
    if (typeof itemType == "object"){
      output = "Choose your item type:";
      // create button elements representing elements in the object, then pass
      // a selection from that object to this function as "variable"
      return createButtons(itemType);
    } else {
      curState = 1;
      // pass itemType to a new instance of this function, with curState 1
      return firstRoll(itemType);
    }
  } else if (curState == 1){
    // set character.kind to the item type
    character.kind = variable;
    // get a list from the store items corresponding to the item type
    var tempEquip = storeList[variable];
    // if item is special, store type in character.equipment for later output
    // string, run this function with curState 2
    if (!character.store) {
      //later, this should instead set tempEquip to specialList(variable),
      // and be split into a separate conditional
      output = "You rolled a special item!";
      character.special = character.kind[0].toUpperCase() + character.kind.slice(1);
      curState = 2;
      return firstRoll("Special");
      // if there are multiple options, make buttons to select from them
    } else if (typeof tempEquip == "object" && character.kind != "accessory"){
      output = "Choose your " + character.kind + ":";
      // get a random choice from the database table
      return createButtons(returnRandomEntry(tempEquip));
    } else {
      curState = 2;
      // get a random choice from the database table
      return firstRoll(returnRandomEntry(tempEquip));
    }
  } else if (curState == 2){
    // set character.equipment to passed variable
    character.equipment = variable;
    output ="You rolled: " + "<b>" + variable + "</b>"+ "!" + "<br><br>";
    output += "Choose your enhancement type:";
    // check enhancement from complicated set of rules, pass as variable to new
    // firstRoll instance
    return magicFinder(character.kind);
  } else if (curState == 3) {
    // set character.magic to enhancement
    character.magic = variable;
    //should be removed when special items are added
    if (character.equipment == "Special"){
      character.stat = "No stats available for special items."
    } else {
      // get the stats of an item from tables, then return as a string delimited
      // by line breaks
      character.stat = getStats();
    }
    // minor tweaks to pretty up values, order suffixes and prefixes
    output = formatOutput();
    // output final values to divs
    document.getElementById("result").innerHTML = "<b>" + output + "</b>";
    if (document.getElementById("logContent").innerHTML == "") {
    setCount = 0;
    logMarkSet();
    document.getElementById("logMarkSet").className = "enabled";
    document.getElementById("logMarkSet").disabled = false;
    }
    document.getElementById("logContent").innerHTML += "<!--New Entry--> <br>" + "Your <b>" + character.class[0].toUpperCase() + character.class.substring(1) + "</b> rolled... <br />" + output;
    if ((character.kind != "accessory") && (character.store == true)) {
      count += 1;
      document.getElementById("logContent").innerHTML += "<br>";
      var div = document.createElement("DIV");
      var expButton = document.createElement("BUTTON");
      var t2 = document.createTextNode("Show Stats");
      var divName = "statDiv" + count;
      div.id = divName;
      div.className = "invisible";
      div.innerHTML = character.stat;
      expButton.id = divName + "button";
      expButton.className = "expButton";
      expButton.appendChild(t2);
      document.getElementById("logContent").appendChild(expButton);
      document.getElementById("logContent").appendChild(div);
    }
    for (i=1;i<=count;i++){
        handleButton(i);
      }
    document.getElementById("stat").innerHTML = character.stat;
    localStorage["lastlog"] = document.getElementById("logContent").innerHTML;
    curState = 0;
  }

}
function logMarkSet(){
  setCount += 1;
  var div = document.createElement("DIV");
  div.innerHTML = "<b>Set " + setCount + "</b>";
  div.className = "setHeader";
  document.getElementById("logContent").innerHTML += "<!--New Set-->";
  document.getElementById("logContent").appendChild(div);
  for (i=1;i<=count;i++){
      handleButton(i);
  }
  localStorage["lastlog"] = document.getElementById("logContent").innerHTML;
}

function handleButton(i){
  document.getElementById("statDiv"+i+"button").onclick = function (){
    this.swap = document.getElementById(this.id.toString().substring(0, this.id.length - 6));
    if (this.swap.className == "visible") {
      this.swap.className = "invisible";
      this.innerHTML = "Show Stats";
    } else {
      this.swap.className = "visible";
      this.innerHTML = "Hide Stats";
    }
  }
}

function formatOutput(){
  /* This function formats the output string after all of the variables have
  been set. Requires character object to be filled. Should be tweaked later to
  pass in character object.*/
  // capitalize and add spaces to tier variable
  formattedTier = character.tier[0].toUpperCase() + character.tier.slice(1, 4) + " " + character.tier.slice(4);
  var output = formattedTier + " ";
  // look for "of" in enhancements, then sort them into prefixes and suffixes
  var suffixes = [];
  var prefixes = [];
  if (typeof character.magic == "object"){
    for (enchant in character.magic){
      // pushes sorted prefixes and suffixes to array
      if (character.magic[enchant].indexOf("of") > -1){
        suffixes.push(character.magic[enchant]);
      } else {
        prefixes.push(character.magic[enchant]);
      }
    }
    // joins prefix and suffix arrays into a single string
    prefixes = prefixes.join(" ");
    suffixes = suffixes.join(" ");
  } else {
    // sort non-objects
    if (character.magic.indexOf("of") > -1){
      suffixes = (character.magic);
    } else {
      prefixes = character.magic;
  }
}
  output += prefixes + " " + character.equipment + " " + character.special + " " + suffixes;
  return output;
}
function createButtons (list){
  /*This function takes an array, creates buttons for each element in that array,
  and passes the user selection to a new instance of firstRoll, incrementing curState
  by one. */
  // output message formatted in firstRoll to guide the user
  document.getElementById("result").innerHTML = output;
  // create buttons for each element in list
  for (item in list) {
    var button = document.createElement("BUTTON");
    var t = document.createTextNode(list[item]);
    button.appendChild(t);
    // give each button an onclick function which re-enables other controls,
    // clears the control div, and returns firstRoll with the button's text
    // as an argument
    button.onclick = function (){
      document.getElementById("controls").innerHTML = "";
      list = this.innerHTML;
      document.getElementById("rollButton").className = "enabled";
      document.getElementById("class").className = "enabled";
      document.getElementById("tier").className = "enabled";
      document.getElementById("rollButton").disabled = false;
      document.getElementById("class").disabled = false;
      document.getElementById("tier").disabled = false;
      curState += 1;
      return firstRoll(list);
      }
    document.getElementById("controls").appendChild(button);
    }
  // disable all other controls until a button is chosen
  document.getElementById("rollButton").className = "disabled";
  document.getElementById("tier").className = "disabled";
  document.getElementById("class").className = "disabled";
  document.getElementById("rollButton").disabled = true;
  document.getElementById("tier").disabled = true;
  document.getElementById("class").disabled = true;
}

function returnRandomEntry(array){
  // return a random entry from an array
  return array[(Math.floor(Math.random()*(array.length)))];
}

function selectCheck(select, listName){
  // check item against a list
  for (entry in select) {
    if (listName == entry){
      rollTable = select[entry];
      return rollTable;
    }
  }
}

/* A set of functions to simulate dicerolls, mostly deprecated with new database
structure.*/

function roll4(){
  return Math.floor(Math.random()*4)+1;
}

function roll6(){
  return Math.floor(Math.random()*6)+1;
}
function roll10(){
  return Math.floor(Math.random()*10)+1;
}
function roll20(list){
  return Math.floor(Math.random()*20)+1;
}

function roll100(list){
  return Math.floor(Math.random()*100)+1;
}

function magicFinder (category){
  //logic for rolling enhancements
  //accepts type of item, outputs list of enhancements

  // get a number corresponding to tier level
  var tier = Number(character.tier[(character.tier.length - 1)]);
  var out = [];
  previous = "";
  // tier 3 armor rolls once, tier 4-6 has a 50% chance to roll twice,
  // above rolls twice
  if (category == "armor"){
    var double = coinflip();
    if (((tier > 3) && (double > 0)) || (tier > 6)){
      // ensures that the same enhancement is not rolled twice
      previous = armorLoop();
      out.push(previous);
    }
    out.push(armorLoop(previous));
    curState = 3;
    return firstRoll(out);
      }
    else if (category == "offhand"){
      // offhand is the simplest item type: take a random enhancement, reroll
      // if a shield and "Energized"
      curState = 3;
      var offhandMaj = returnRandomEntry(magicObj["offhand"]);
      if((character.equipment.indexOf("Shield")>0) || (character.equipment == "Buckler")){
        // shields can't be "Energized", so this code changes that enhancement to "Hardy"
        if (offhandMaj == "Energized"){
          offhandMaj = "Hardy";
        }
      }
      return firstRoll(offhandMaj);
  } else if (category == "accessory"){
      // players have choices for accessories sometimes,
      // so it uses the "createButtons" function
      var classTable = magicObj["accessory"][character.class];
      var roll = roll20();
      for (attribute in classTable){
        if (roll <= classTable[attribute][0]){
          if (typeof classTable[attribute][1] != "object"){
            curState = 3;
            return firstRoll(classTable[attribute][1]);
          } else {
            return createButtons(classTable[attribute][1]);
          }
        }
      }
  } else if (category == "weapon"){
    // this could probably be handled with a database, but it's awkward
    // chooses randomly from lists depending on tier level
    curState = 3;
    if (tier <= 5){
      var roll = roll10();
      if (roll == 10){
        return firstRoll([returnRandomEntry(magicObj["weapon"]["C"])[1]]);
      } else {
        return firstRoll([returnRandomEntry(magicObj["weapon"]["B"])[1]]);
      }
    } else if (tier == 6){
      return firstRoll([returnRandomEntry(magicObj["weapon"]["B"])[1], returnRandomEntry(magicObj["weapon"]["C"])[1]])
    } else if (tier == 7){
      var roll = roll100();
      if (roll <= 90){
        return firstRoll([returnRandomEntry(magicObj["weapon"]["B"])[1], returnRandomEntry(magicObj["weapon"]["C"])[1]]);
      } else if (roll <= 96) {
        return firstRoll([returnRandomEntry(magicObj["weapon"]["B"])[1], returnRandomEntry(magicObj["weapon"]["S"])[1]]);
      } else {
        return firstRoll([returnRandomEntry(magicObj["weapon"]["C"])[1], returnRandomEntry(magicObj["weapon"]["S"])[1]]);
      }
    } else if (tier == 8){
      var roll = roll100();
      if (roll <= 80){
        return firstRoll([returnRandomEntry(magicObj["weapon"]["B"])[1], returnRandomEntry(magicObj["weapon"]["C"])[1]]);
      } else if (roll <= 90){
        return firstRoll([returnRandomEntry(magicObj["weapon"]["B"])[1], returnRandomEntry(magicObj["weapon"]["S"])[1]]);
      } else {
        return firstRoll([returnRandomEntry(magicObj["weapon"]["C"])[1], returnRandomEntry(magicObj["weapon"]["S"])[1]]);
      }
    } else {
      return firstRoll([returnRandomEntry(magicObj["weapon"]["B"])[1], returnRandomEntry(magicObj["weapon"]["C"])[1], returnRandomEntry(magicObj["weapon"]["S"])[1]]);
    }
  }
}
function armorLoop(previous){
  // rolls armor enhancements and checks for duplicates
  var roll = roll100();
  for (x in (magicObj["armor"])){
    if (roll <= magicObj["armor"][x][0]){
      if (magicObj["armor"][x][1] == previous){
        return armorLoop(previous);
      } else {
        return magicObj["armor"][x][1];
      }
    }
  }
}

function getStats(){
  /* This function gets the stats of an item. The logic is different depending
  on the item type, but items are generally stored as an array of string-value
  pairs. The function loops through each pair, looks for a combination of the
  initial value and the tier number, then adds it to the paired base value.
  Exceptions are made for unusual types.*/

  // get all necessary tables and variables
  var progressionTable = masterTable.stats.progression;
  var baseTable = masterTable.stats.base;
  var statString = "";
  var baseStats = baseTable[character.equipment];
  var tierIndex = Number(character.tier[(character.tier.length - 1)])- 1;
  for (stat in baseStats){
  var postString = "";
  var searchString = "";
  var dmgNum = "";
  var dieNum = "";
  var noProg = false;

  // set search string based on attribute type
  if (baseStats[stat][0].indexOf("Requirement")>0){
    searchString = "base";
    searchString += baseStats[stat][1];
  } else if(baseStats[stat][0] == "DR"){
    searchString = "DR"+ Number(baseStats[stat][1].substring(0, 1));
    postString = baseStats[stat][1].substring(1);
  } else if (baseStats[stat][0].indexOf("Damage")>0){
    // splits string on location of "d" and location of "+". Only use string of form "ndx+y"
    searchString = baseStats[stat][0];
    dieNum = Number(baseStats[stat][1].substring(0, baseStats[stat][1].indexOf("d")));
    postString = baseStats[stat][1].substring(baseStats[stat][1].indexOf("d"), baseStats[stat][1].indexOf("+")) + " + ";
    dmgNum = Number(baseStats[stat][1].substring(baseStats[stat][1].indexOf("+")+1, baseStats[stat][1].length));
  }
  // filters stats without progression - might be better handled with a database
  else if ((baseStats[stat][0] == "Range")||(baseStats[stat][0] == "Value")||(baseStats[stat][0] == "Special Stats")||(baseStats[stat][0] == "Hands")){
    noProg = true;
    newStat = baseStats[stat][1];
  }
    else {
    searchString = baseStats[stat][0];
    searchString += baseStats[stat][1];
    }
    if (noProg == false){
      var newStat = progressionTable[searchString][tierIndex];
      // gets damage numbers from a string
      if (dieNum){
        dieNum += dieNum*Number(newStat.substring(0, newStat.indexOf("x")));
        dmgNum += Number(newStat.substring(newStat.indexOf("x")+1, newStat.length));
        newStat = dieNum;
      }
    }
    // puts each stat on a different line
    statString += baseStats[stat][0] + ": " + newStat + postString + dmgNum + "<br />";
  }
  return(statString);
}

function coinflip(){
  // returns 0 or 1 with a 50-50 chance
  return Math.round(Math.random());
}
// loads the wrapper function / xml request for JSON data
window.onload = xmlRequests;
