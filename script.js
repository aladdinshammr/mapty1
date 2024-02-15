"use strict";

const form = document.querySelector(".form");
const containerWorkouts = document.querySelector(".workouts");
const inputType = document.querySelector(".form__input--type");
const inputDistance = document.querySelector(".form__input--distance");
const inputDuration = document.querySelector(".form__input--duration");
const inputCadence = document.querySelector(".form__input--cadence");
const inputElevation = document.querySelector(".form__input--elevation");

class Workout {
  date = new Date();
  id = Date.now() + "".slice(-10);

  constructor(coords, distance, duration) {
    this.coords = coords;
    this.distance = distance;
    this.duration = duration;
  }

  _setDescription() {
    // prettier-ignor
    const months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDay()}`;
  }
}

class Running extends Workout {
  type = "running";
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    this.pace = (this.duration / this.distance).toFixed(1);
  }
}

class Cycling extends Workout {
  type = "cycling";
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    this.speed = (this.distance / (this.duration / 60)).toFixed(1);
  }
}

class App {
  #map;
  #mapEvent;
  #workouts = [];
  #mapZoomLevel = 13;

  constructor() {
    this._getPosition();
    form.addEventListener("submit", this._newWorkout.bind(this));

    inputType.addEventListener("change", this._toggleElevationField);

    containerWorkouts.addEventListener("click", this._moveToPopup.bind(this));
  }

  _getPosition() {
    navigator.geolocation?.getCurrentPosition(
      this._loadMap.bind(this),
      function (error) {
        alert(error.message);
      }
    );
  }

  _loadMap(location) {
    const { latitude: lat, longitude: lng } = location.coords;
    const coords = [lat, lng];
    // console.log(`https://www.google.com/maps/@${lat},${lng}`);
    this.#map = L.map("map").setView(coords, this.#mapZoomLevel);

    L.tileLayer("http://{s}.google.com/vt?lyrs=m&x={x}&y={y}&z={z}", {
      subdomains: ["mt0", "mt1", "mt2", "mt3"],
      maxZoom: 20,
    }).addTo(this.#map);

    this.#map.on("click", this._showForm.bind(this));
    this._getLocalStorage();
  }

  _showForm(e) {
    form.classList.remove("hidden");
    inputDistance.focus();
    this.#mapEvent = e;
  }

  _hideForm() {
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        "";

    form.style.display = "none";
    form.classList.add("hidden");

    setTimeout(() => (form.style.display = "grid"));
  }

  _toggleElevationField() {
    inputCadence.closest(".form__row").classList.toggle("form__row--hidden");
    inputElevation.closest(".form__row").classList.toggle("form__row--hidden");
  }

  _newWorkout(e) {
    e.preventDefault();

    // Helper function

    const isNum = (...values) => values.every((value) => isFinite(value));
    const isPositive = (...values) => values.every((value) => value > 0);

    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    const position = [lat, lng];

    let workout;

    if (type == "running") {
      const cadence = +inputCadence.value;

      if (
        !isNum(distance, duration, cadence) ||
        !isPositive(distance, duration, cadence)
      )
        return alert("please, input positive numbers");

      workout = new Running(position, distance, duration, cadence);
    }

    if (type == "cycling") {
      const elevation = +inputElevation.value;

      if (
        !isNum(distance, duration, elevation) ||
        !isPositive(distance, duration)
      )
        return alert("please, input positive numbers");

      workout = new Cycling(position, distance, duration, elevation);
    }

    this.#workouts.push(workout);

    this._setLocalStorage();

    this._renderWorkoutMark(workout);

    // clear inputs
  }

  _renderWorkoutMark(workout) {
    const popup = L.popup(workout.coords, {
      maxWidth: 250,
      minWidth: 100,
      autoClose: false,
      closeOnClick: false,
      className: `${workout.type}-popup`,
      content: `${workout.type == "running" ? "🏃‍♂️" : "🚴"} ${
        workout.description
      }`,
    }).openOn(this.#map);

    L.marker(workout.coords).addTo(this.#map).bindPopup(popup).openPopup();

    this._renderWorkout(workout);
  }

  _renderWorkout(workout) {
    const html = `
    <li class="workout workout--${workout.type}" data-id="${workout.id}">
          <h2 class="workout__title">${workout.description}</h2>
          <div class="workout__details">
            <span class="workout__icon">${
              workout.type == "running" ? "🏃‍♂️" : "🚴"
            }</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.pace ?? workout.speed}</span>
            <span class="workout__unit">${
              workout.type == "running" ? "min/km" : "km/h"
            }</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">${
              workout.type == "running" ? "👣" : "🚵"
            }</span>
            <span class="workout__value">${
              workout.cadence ?? workout.elevationGain
            }</span>
            <span class="workout__unit">spm</span>
          </div>
        </li>
    `;

    form.insertAdjacentHTML("afterend", html);

    this._hideForm();
  }

  _moveToPopup(e) {
    const workout = e.target.closest(".workout");

    if (!workout) return;
    const clickedElemnt = this.#workouts.find(
      (work) => work.id === workout.dataset.id
    );

    this.#map.setView(clickedElemnt.coords, this.#mapZoomLevel, {
      animate: true,
      duration: 1,
    });
  }

  _setLocalStorage() {
    localStorage.setItem("workouts", JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem("workouts"));
    if (!data) return;
    this.#workouts = data;
    this.#workouts.forEach((work) => {
      this._renderWorkout(work);
      this._renderWorkoutMark(work);
    });
  }

  restLocalStorage() {
    localStorage.removeItem("workouts");
    location.reload();
  }
}

const app = new App();
