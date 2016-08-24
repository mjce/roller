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
character = {class: "delver", tier: "tier6", kind:"none", equipment:"none", special: " ", magic: "", stat: "", source: "store"};
output = "";
itemType = "";
count = 0;
setCount = 0;
var partyDB = new PouchDB('party');
var remoteCouch = 'http://descension.me/couch/party';

function sync() {
  var opts = {live: true};
  partyDB.replicate.to(remoteCouch, opts, syncError);
  partyDB.replicate.from(remoteCouch, opts, syncError);
}
function syncError() {
 }
function xmlRequests () {
  //this runs on load, so it's part wrapper and part xml request.  should probably be split into two.
  sync();
  document.getElementById("rollButton").className = "enabled";
  document.getElementById("rollButton").disabled = false;
  document.getElementById("class").className = "enabled";
  document.getElementById("tier").className = "enabled";
  document.getElementById("class").disabled = false;
  document.getElementById("tier").disabled = false;
  document.getElementById("result").innerHTML = "Congratulations, adventurer! Roll your item!";
  document.getElementById("seedItemList").selectedIndex = 0;
  curState = 0;
  var tableRequest = new XMLHttpRequest();
  var url = "rollJSON.txt";
  function checkLocal(){
    //checks to see if values have been initialized to local storage. If they have not, it initializes them.
    if(!localStorage["lastlog"]){
    localStorage["lastlog"] = "";
    }
    if(!localStorage["lastresult"]){
    localStorage["lastresult"] = "Congratulations, adventurer! Roll your item!";
    }
    if(!localStorage["laststat"]){
    localStorage["laststat"] = "";
    }
  }
  tableRequest.onreadystatechange = function() {
      if (tableRequest.readyState == 4 && tableRequest.status == 200) {
          masterTable = JSON.parse(tableRequest.responseText);
          classObj = masterTable.classes;
          magicObj = masterTable.magic;
          storeList = masterTable.store;
          specialList = masterTable.special;
          document.getElementById("seedItemType").selectedIndex = 0;
          onChangeSeedItemType();
          checkLocal();
          //document.getElementById("stat").innerHTML = localStorage["laststat"];
          //document.getElementById("result").innerHTML = localStorage["lastresult"];
          document.getElementById("logContent").innerHTML = localStorage["lastlog"];
          setCount = setCheck();
          if (setCount > 0){
            document.getElementById("logMarkSet").className = "enabled";
            document.getElementById("logMarkSet").disabled = false;
            document.getElementById("logDownload").className = "enabled";
            document.getElementById("logDownload").disabled = false;
          }
          if (document.getElementById("logContent").innerHTML == ""){
            document.getElementById("logMarkSet").className = "disabled";
            document.getElementById("logMarkSet").disabled = true;
            document.getElementById("logDownload").className = "disabled";
            document.getElementById("logDownload").disabled = true;
          }
      }
  };
  tableRequest.open("GET", url, true);
  tableRequest.send();
}
//returns number of sets by counting divs in logContent
function setCheck(){
  setCount = 0;
  var nodeList = document.getElementById("logContent").childNodes;
  Array.prototype.forEach.call (nodeList, function (node) {
    if (node.tagName == "div"){
    setCount++;
    }
});
}

function storeCheck(){
  //returns true 1/4 of the time
  check = roll4();
  if (check != 4){
    character.special = " ";
    return "store";
  } else {
    character.special = " special ";
    return "special";
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
  setCount = 0;
  document.getElementById("logMarkSet").disabled = true;
  document.getElementById("logMarkSet").className = "disabled";
  document.getElementById("logDownload").disabled = true;
  document.getElementById("logDownload").className = "disabled";
  document.getElementById("logContent").innerHTML = "";
  localStorage["lastlog"] = document.getElementById("logContent").innerHTML;
}

function clearLogLast(){
  // removes the last item or set marker added
  var nodeList = document.getElementById("logContent").childNodes;
  var lastNode = nodeList[nodeList.length - 1];
  if (lastNode.tagName == "div"){
    document.getElementById("logContent").removeChild(lastNode);
    setCheck();
  } else if (lastNode.tagName == "ul") {
    if(lastNode.childNodes.length > 0){
      lastNode.removeChild(lastNode.childNodes[lastNode.childNodes.length - 1]);
    }
    if(lastNode.childNodes.length == 0){
      document.getElementById("logContent").removeChild(lastNode);
    }
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
    output = "";
    //get the tier level and class from the select elements in index.html
    var dropDown = document.getElementById("tier");
    character.tier = dropDown.options[dropDown.selectedIndex].id;
    dropDown = document.getElementById("class");
    character.class = dropDown.options[dropDown.selectedIndex].id;
    //check if the item is a store item, set character.store to boolean
    character.kind = document.getElementById("seedItemType").options[document.getElementById("seedItemType").selectedIndex].value;
    character.source = document.getElementById("seedItemList").options[document.getElementById("seedItemList").selectedIndex].value;
    character.equipment = document.getElementById("seedSubtype").options[document.getElementById("seedSubtype").selectedIndex].value;
    character.stat = "";

    //roll on a series of tables to determine item type, return string or object
    if (character.equipment != "none"){
      curState = 2;
      return firstRoll(document.getElementById("seedSubtype").options[document.getElementById("seedSubtype").selectedIndex].value);
    } else if (character.kind != "none"){
        curState = 1;
        return firstRoll(document.getElementById("seedItemType").options[document.getElementById("seedItemType").selectedIndex].value);
      } else if (character.source != "none"){
        if (character.source = "special"){character.special = " special "} else {character.special = " "}
      } else {
        character.source = storeCheck();
      }
    itemType = typeItem();
    if (typeof itemType == "object"){
      output = "Choose your" + character.special + "item type:";
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
    var tempEquip;
    if (character.source == "store"){
      tempEquip = storeList[variable];
    } else {
      var tempEquip = specialList[variable];
    }
    // if item is special, store type in character.equipment for later output
    // string, run this function with curState 2
  if ((tempEquip[0][1]) && character.kind != "accessory"){
      output = "Choose your " + character.special + character.kind + ":";
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
    output ="<span>You rolled: " + "<b>" + variable + "</b>"+ "!" + "<br><br><span>";
    output += "Choose your enhancement type:";
    // check enhancement from complicated set of rules, pass as variable to new
    // firstRoll instance
    return magicFinder(character.kind);
  } else if (curState == 3) {
    // set character.magic to enhancement
    character.magic = variable;
    character.stat = getStats();
    character.magicStats = getMagicStats(character.magic);
      // get the stats of an item from tables, then return as a string delimited
      // by line breaks
    output = formatOutput();
    // output final values to divs
    var content = document.getElementById("logContent");
    var lastNode = content.childNodes[content.childNodes.length - 1];
    document.getElementById("result").innerHTML = "<b>" + output + "</b>";
    if (content == "") {
    setCount = 0;
    logMarkSet();
    document.getElementById("logMarkSet").className = "enabled";
    document.getElementById("logMarkSet").disabled = false;
    document.getElementById("logDownload").className = "enabled";
    document.getElementById("logDownload").disabled = false;
    }
    //fires if last element in log is not an unordered list
    //appends an unordered list with appropriate properties, updates lastNode
    var nodeList = document.getElementById("logContent").childNodes;
    var lastNode = nodeList[nodeList.length - 1];
    if (lastNode.tagName != "ul" || lastNode == null){
      var ul = document.createElement("UL");
      jQuery.data(ul, "set", setCount);
      ul.className = "item-list";
      content.appendChild(ul);
      lastNode = ul;
    }
    document.getElementById("stat").innerHTML = character.stat + "<br>" + character.magicStats;
    var newItem = document.createNode("LI");
    newItem.className = "item";
    jQuery.data(newItem, "id", new Date.toISOString());
    jQuery.data(newItem, "store", character.source);
    jQuery.data(newItem, "type", character.kind);
    jQuery.data(newItem, "stats", character.stat);
    jQuery.data(newItem, "bonus", character.magic);
    newItem.title = document.getElementById("stat").innerHTML;
    newItem.appendChild(document.createTextNode(item.title));
    document.getElementById(lastNode).appendChild(newItem);
    localStorage["lastlog"] = document.getElementById("logContent").innerHTML;
    localStorage["laststat"] = document.getElementById("stat").innerHTML;
    localStorage["lastresult"] = document.getElementById("result").innerHTML;
    curState = 0;
    document.getElementById("seedItemList").selectedIndex = 0;
    createSelect([], "seedItemType");
    createSelect([], "seedSubtype");
  }
function getMagicStats(){
  var magicStats = "<b>Enhancement Bonuses:</b><br>";
  var magicTable = masterTable["enhancements"][character.kind];
  var adjustedTier = Number(character.tier.slice(4)-1);
  if (character.kind != "accessory") {
      for (enchantment in character.magic){
        current = magicTable[character.magic[enchantment]];
        magicStats += current[0] + ": " + current[1][adjustedTier] + "<br>";
      }
    } else {
      magicStats += character.magic.toString().substring(3)+ ": " + magicTable[character.tier]["primary"] + "<br>All Other Stats: " + magicTable[character.tier]["secondary"];
    }
  magicStats = parseDice(magicStats);
  magicStats = parseFlip(magicStats);
  magicStats = parseBase(character.stat, magicStats);
  return magicStats;
}
}
function logMarkSet(){
  var div = document.createElement("DIV");
  div.innerHTML = "<b>Set " + setCount + "</b>";
  div.className = "setHeader";
  document.getElementById("logContent").innerHTML += "<!--New Set-->";
  document.getElementById("logContent").appendChild(div);
  setCheck();
  localStorage["lastlog"] = document.getElementById("logContent").innerHTML;
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
  output += prefixes + " " + character.equipment + " " + suffixes;
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
function roll5(){
  return Math.floor(Math.random()*5)+1;
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
      if((character.equipment.indexOf("Shield")>0) || (character.equipment == "Buckler") || (character.equipment.indexOf("Tonfa")>0) ||(character.equipment.indexOf("Bouche") > 0) ){
        // shields can't be "Energized", so this code changes that enhancement to "Hardy"
        if (offhandMaj == "Energized"){
          offhandMaj = "Hardy";
        }
      }
      return firstRoll([offhandMaj]);
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
    var enchantList = [];
    var cTest = "";
    if (tier <= 5){
      var roll = roll10();
      if (roll == 10){
        cTest = returnRandomEntry(magicObj["weapon"]["C"])[1];
      } else {
        enchantList.push(returnRandomEntry(magicObj["weapon"]["B"])[1]);
      }
    } else if (tier == 6){
      enchantList.push(returnRandomEntry(magicObj["weapon"]["B"])[1]);
      cTest = returnRandomEntry(magicObj["weapon"]["C"])[1];
    } else if (tier == 7){
      var roll = roll100();
      if (roll <= 90){
        enchantList.push(returnRandomEntry(magicObj["weapon"]["B"])[1]);
        cTest = returnRandomEntry(magicObj["weapon"]["C"])[1];
      } else if (roll <= 96) {
        enchantList.push(returnRandomEntry(magicObj["weapon"]["B"])[1]);
        enchantList.push(returnRandomEntry(magicObj["weapon"]["S"])[1]);
      } else {
        enchantList.push(returnRandomEntry(magicObj["weapon"]["S"])[1]);
        cTest = returnRandomEntry(magicObj["weapon"]["C"])[1];
      }
    } else if (tier == 8){
      var roll = roll100();
      if (roll <= 80){
        enchantList.push(returnRandomEntry(magicObj["weapon"]["B"])[1]);
        cTest = returnRandomEntry(magicObj["weapon"]["C"])[1];
      } else if (roll <= 90){
        enchantList.push(returnRandomEntry(magicObj["weapon"]["B"])[1]);
        enchantList.push(returnRandomEntry(magicObj["weapon"]["S"])[1]);
      } else {
        enchantList.push(returnRandomEntry(magicObj["weapon"]["S"])[1]);
        cTest = returnRandomEntry(magicObj["weapon"]["C"])[1];
      }
    } else {
      enchantList.push(returnRandomEntry(magicObj["weapon"]["B"])[1]);
      enchantList.push(returnRandomEntry(magicObj["weapon"]["S"])[1]);
      cTest = returnRandomEntry(magicObj["weapon"]["C"])[1];
    }
    if ((character.equipment.indexOf("bow") != -1) || (character.equipment.indexOf("Star")) != -1){
      if (cTest == "Extending"){
        cTest = weaponLoop(cTest);
      }
    } else if ((cTest == "Powerful" && (character.equipment.indexOf("Javelins") == -1) && (character.equipment.indexOf("Axes") == -1))||(cTest == "Extending" && (Number(character.tier.substring(4))<4))){
      cTest = weaponLoop(cTest);
      }
    if(cTest){enchantList.push(cTest);}
    return firstRoll(enchantList);
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
function weaponLoop(previous){
  // rolls weapon enhancements and checks for duplicates
  var roll = roll5();
  for (x in (magicObj["weapon"]["C"])){
    if (roll <= magicObj["weapon"]["C"][x][0]){
      if (magicObj["weapon"]["C"][x][1] == previous){
        return weaponLoop(previous);
      } else {
        return magicObj["weapon"]["C"][x][1];
      }
    }
  }
}
function onChangeSeedList(){
  character.source = document.getElementById("seedItemList").options[document.getElementById("seedItemList").selectedIndex].value;
  if (character.source != "none"){
    createSelect([["weapon"], ["armor"], ["offhand"], ["accessory"]], "seedItemType");
  } else {
    createSelect([], "seedItemType")
  }
  return createSelect([], "seedSubtype");
}
function onChangeSeedItemType(){
  var typeSelect = document.getElementById("seedItemType");
  character.kind = typeSelect.options[typeSelect.selectedIndex].value;
  document.getElementById("seedSubtype").innerHTML = "";
  if (character.kind != "accessory"){
    return createSelect(masterTable[character.source][character.kind], "seedSubtype");
  } else {
    return createSelect([masterTable[character.source][character.kind]], "seedSubtype");
  }
}

function createSelect(list, id){
  //looks through table for members of item type, and outputs all non-duplicates as alphabetized options in a select element
  document.getElementById(id).innerHTML = "";
  var tempList = [];
  for (member in list) {
    for (entry in list[member]){
      if (tempList.indexOf(list[member][entry]) == -1){
        tempList.push(list[member][entry]);
      }
      }
    }
    tempList = tempList.sort();
    tempList.unshift("none");
    for (thing in tempList){
      var option = document.createElement("OPTION");
      var t = document.createTextNode(tempList[thing]);
      option.appendChild(t);
      document.getElementById(id).appendChild(option);
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
  else if ((baseStats[stat][0] == "Range")||(baseStats[stat][0] == "Flavor")||(baseStats[stat][0] == "Special Stats")||(baseStats[stat][0] == "Hands")){
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
        dieNum += Number(newStat.substring(0, newStat.indexOf("x")));
        dmgNum += Number(newStat.substring(newStat.indexOf("x")+1, newStat.length));
        newStat = dieNum;
      }
    }
    // puts each stat on a different line
    if (baseStats[stat][0] == "Flavor"){
      statString += newStat + postString + dmgNum + "<br />";
    } else {
      statString += baseStats[stat][0] + ": " + newStat + postString + dmgNum + "<br />";
    }
    statString = parseTier(statString);
    statString = parseAlternateTier(statString);
  }
  return(statString);
}
function parseFlip(string){
  var pattern = new RegExp("[0-9]{1,2}cf[0-9]{1,2}");
  var result = pattern.exec(string);
  while (result != null){
    result = result.toString();
    var cf = result.indexOf("cf");
    var add = Number(result.substring(0, cf));
    var flip = Number(result.substring(cf+2));
    add += Math.round(Math.random())*flip;
    var number = add.toString();
    string = string.replace(result, number);
    result = pattern.exec(string);
  }
  return string;
}
function parseBase(string, bonusString){
  var crit = string.indexOf("Critical Damage:");
  if(crit == -1){
    return bonusString;
  } else {
    newString = string.substring(crit);
    var dicePattern = new RegExp("[0-9]{1,2}d[0-9]{1,2}");
    result = dicePattern.exec(newString).toString();
    var dice = result.substring(result.indexOf("d"));

    var pattern = new RegExp("[0-9]{1,2}b\\+[0-9]{1,2}");
    result = pattern.exec(bonusString);
    while (result != null){
      result = result.toString();
      var oldResult = result.slice(0);
      result = result.replace("b", dice);
      bonusString = bonusString.replace(oldResult, result);
      result = pattern.exec(bonusString);
    }
    dicePattern = new RegExp("[0-9]?0d[0-9]{1,2}");
    result = dicePattern.exec(bonusString);
    while (result != null){
      result = result.toString();
      if (result[0] == "0"){
        bonusString = bonusString.replace(result, "");
        result = pattern.exec(bonusString);
      } else {
        result = null;
      }
    }
    return bonusString;
  }
}
function parseDice(string){
  var pattern = new RegExp("[0-9]{1,2}d[0-9]{1,2}\\+[0-9]{1,2}");
  var result = pattern.exec(string);
  while (result != null){
    result = result.toString();
    var d = result.indexOf("d");
    var plus = result.indexOf("+");
    var dieNum = Number(result.substring(0, d));
    var die = Number(result.substring(d+1, plus));
    var add = Number(result.substring(plus+1));
    for(i = 0; i<dieNum;i++){
      add += Math.floor(Math.random()*die)+1;
    }
    var number = add.toString();
    string = string.replace(result, number);
    result = pattern.exec(string);
  }
return string;
}
function parseTier(string){
  var pattern = new RegExp("[0-9]{1,2}\\.?[0-9]{0,2}t\\+[0-9]{1,2}");
  var result = pattern.exec(string);
  while(result != null){
    result = result.toString();
    var t = result.indexOf("t");
    var multiplier = Number(result.substring(0, t));
    var add = Number(result.substring(t+2));
    add += Math.floor(multiplier*Number(character.tier.substring(4)));
    string = string.replace(result, add);
    result = pattern.exec(string);
  }
return string;
}
function parseAlternateTier(string){
  var pattern = new RegExp("t[1-9]:[A-Za-z0-9]+\\/");
  var result = pattern.exec(string);
  var highestTier = 0;
  var lastFind = "";
  var itemTier = Number(character.tier.substring(4));
  while(result != null){
    result = result.toString();
    var colon = result.indexOf(":");
    var tier = Number(result.substring(1, colon));
    var slash = result.indexOf("/");
    var resultant = result.substring(colon+1, slash)
    string = string.replace(result, resultant);
    if (tier > highestTier && tier <= itemTier){
      highestTier = tier;
      string = string.replace(lastFind, "");
      lastFind = resultant;
  } else if (tier > itemTier){
    string = string.replace(resultant, "");
  }
    result = pattern.exec(string);
  }
return string;
}
function coinflip(){
  // returns 0 or 1 with a 50-50 chance
  return Math.round(Math.random());
}
function downloadLog() {
    var link = document.createElement('a');
    var mimeType = 'text/html';
    var date = new Date();
    var filename = date.toLocaleDateString() + " Descension Item Log.txt";
    var nodeList = document.getElementById("logContent").childNodes;
    var textLog = "";
    Array.prototype.forEach.call (nodeList, function (node) {
    if (node.tagName == "div"){
        textLog += node.innerHTML + "\r\n\r\n";
      } else if (node.tagName == "ul"){
         Array.prototype.forEach.call (ul, function (li) {
          textLog += li.innerHTML + "\r\n";
        });
        textLog += "\r\n\r\n";
      }
    });
    link.setAttribute('download', filename);
    link.setAttribute('href', 'data:' + mimeType + ';charset=utf-8,' + encodeURIComponent(textLog));
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link)
    return false;
}
// loads the wrapper function / xml request for JSON data
window.onload = xmlRequests;
