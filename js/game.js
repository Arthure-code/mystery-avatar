// The game: the characters are laid out at load from their pictures, and
// one of them is picked in secret. The player ticks at most two features
// and an eye colour, asks to see the selection, and is told how many of the
// five traits match the mystery character; clicking a face is a guess.
// Named functions only.
"use strict";

const MAX_FEATURES = 2;
const FEATURES = ["hat", "beard", "glasses", "moustache"];
const TRAIT_COUNT = FEATURES.length + 1;
const PICTURES_FOLDER = "images/characters/";

// One entry per picture in the folder. The file name lists the traits of the
// character, so the object is read from it.
const PICTURES = [
  "beard_blueeyes.webp", "beard_darkeyes.webp", "blueeyes.webp", "darkeyes.webp",
  "glasses_blueeyes.webp", "glasses_blueeyes_beard.webp", "glasses_darkeyes.webp", "glasses_darkeyes_beard.webp",
  "hat_beard_blueeyes.webp", "hat_beard_darkeyes.webp", "hat_blueeyes.webp", "hat_darkeyes.webp",
  "hat_glasses_blueeyes.webp", "hat_glasses_blueeyes_beard.webp", "hat_glasses_darkeyes.webp", "hat_glasses_darkeyes_beard.webp",
  "hat_moustache_blueeyes.webp", "hat_moustache_blueeyes_beard.webp", "hat_moustache_darkeyes.webp", "hat_moustache_darkeyes_beard.webp",
  "hat_moustache_glasses_beard_blueeyes.webp", "hat_moustache_glasses_beard_darkeyes.webp", "hat_moustache_glasses_blueeyes.webp", "hat_moustache_glasses_darkeyes.webp",
  "moustache_glasses_blueeyes.webp", "moustache_glasses_blueeyes_beard.webp", "moustache_glasses_darkeyes.webp", "moustache_glasses_darkeyes_beard.webp",
];

// "hat_glasses_blueeyes_beard.webp" becomes { hat: true, glasses: true, beard:
// true, moustache: false, blueEyes: true, picture: "..." }.
function characterFromPicture(fileName) {
  const words = fileName.replace(".webp", "").split("_");
  const character = { picture: PICTURES_FOLDER + fileName };
  for (const feature of FEATURES) {
    character[feature] = words.includes(feature);
  }
  character.blueEyes = words.includes("blueeyes");
  return character;
}

const CHARACTERS = [];
for (const fileName of PICTURES) {
  CHARACTERS.push(characterFromPicture(fileName));
}

// Every element the game touches, looked up once.
const charactersList = document.getElementById("characters");
const filters = document.getElementById("filters");
const featureBoxes = [];
for (const feature of FEATURES) {
  featureBoxes.push(document.getElementById(feature));
}
const blueEyesRadio = document.getElementById("blueEyes");
const btnShow = document.getElementById("btnShow");
const btnAgain = document.getElementById("btnAgain");
const result = document.getElementById("result");

let mystery = null;
let solved = false;

const TRAIT_NAMES = { hat: "a hat", beard: "a beard", glasses: "glasses", moustache: "a moustache" };

// A short description of a character in plain English, for its button and
// the winning message: "a hat, glasses and dark eyes".
function describe(character) {
  const traits = [];
  for (const feature of FEATURES) {
    if (character[feature]) traits.push(TRAIT_NAMES[feature]);
  }
  traits.push(character.blueEyes ? "blue eyes" : "dark eyes");
  if (traits.length === 1) return traits[0];
  return traits.slice(0, -1).join(", ") + " and " + traits[traits.length - 1];
}

// One list item per character: a button holding the picture, so a face can
// be clicked or reached with the keyboard.
function buildCharacters() {
  for (let index = 0; index < CHARACTERS.length; index++) {
    const character = CHARACTERS[index];
    const item = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.index = String(index);
    button.setAttribute("aria-label", "Character " + (index + 1) + ": " + describe(character));
    const picture = document.createElement("img");
    picture.src = character.picture;
    picture.alt = "";
    picture.width = 100;
    picture.height = 100;
    button.append(picture);
    item.append(button);
    charactersList.append(item);
  }
}

// A random index from the browser's cryptographic generator.
function randomIndex(count) {
  const draw = new Uint32Array(1);
  crypto.getRandomValues(draw);
  return draw[0] % count;
}

function pickMystery() {
  mystery = CHARACTERS[randomIndex(CHARACTERS.length)];
}

// The selection as an object shaped like a character: the four features from
// the boxes and the eye colour from the radios.
function readSelection() {
  const selection = {};
  for (const box of featureBoxes) {
    selection[box.id] = box.checked;
  }
  selection.blueEyes = blueEyesRadio.checked;
  return selection;
}

// True when the character has exactly the selected features and eye colour.
function matches(character, selection) {
  for (const feature of FEATURES) {
    if (character[feature] !== selection[feature]) return false;
  }
  return character.blueEyes === selection.blueEyes;
}

// How many of the five traits the selection has right about the mystery.
function countMatchingTraits(selection) {
  let count = 0;
  for (const feature of FEATURES) {
    if (mystery[feature] === selection[feature]) count++;
  }
  if (mystery.blueEyes === selection.blueEyes) count++;
  return count;
}

function countTicked() {
  let ticked = 0;
  for (const box of featureBoxes) {
    if (box.checked) ticked++;
  }
  return ticked;
}

// Once two boxes are ticked, the others are disabled until one is unticked.
function limitFeatures() {
  const ticked = countTicked();
  for (const box of featureBoxes) {
    box.disabled = !box.checked && ticked >= MAX_FEATURES;
  }
}

function setDimmed(predicate) {
  for (const button of charactersList.querySelectorAll("button")) {
    button.classList.toggle("dimmed", predicate(button));
  }
}

function characterOf(button) {
  return CHARACTERS[Number(button.dataset.index)];
}

// The faces that match the selection stay bright, the others fade; the line
// under the button gives the score.
function showSelection(event) {
  event.preventDefault();
  if (solved) return;
  const selection = readSelection();
  function doesNotMatch(button) {
    return !matches(characterOf(button), selection);
  }
  setDimmed(doesNotMatch);
  const found = countMatchingTraits(selection);
  result.textContent = "You got " + found + " of " + TRAIT_COUNT + " traits right.";
  result.classList.remove("win");
}

function guess(event) {
  const button = event.target.closest("button");
  if (!button || solved) return;
  const character = characterOf(button);
  if (character !== mystery) {
    result.textContent = "Not that one. Keep looking.";
    result.classList.remove("win");
    return;
  }
  solved = true;
  function isNotTheOne(other) {
    return other !== button;
  }
  setDimmed(isNotTheOne);
  result.textContent = "Well done! The mystery character has " + describe(character) + ".";
  result.classList.add("win");
  btnShow.hidden = true;
  btnAgain.hidden = false;
}

function never() {
  return false;
}

function playAgain() {
  solved = false;
  pickMystery();
  filters.reset();
  limitFeatures();
  setDimmed(never);
  result.textContent = "";
  result.classList.remove("win");
  btnAgain.hidden = true;
  btnShow.hidden = false;
}

function init() {
  buildCharacters();
  pickMystery();
  for (const box of featureBoxes) {
    box.addEventListener("change", limitFeatures);
  }
  filters.addEventListener("submit", showSelection);
  charactersList.addEventListener("click", guess);
  btnAgain.addEventListener("click", playAgain);
}

init();
