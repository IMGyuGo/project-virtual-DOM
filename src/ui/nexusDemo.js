function twoDigits(value) {
  return String(value).padStart(2, '0');
}

function createRoomCard(state) {
  const room = document.createElement('article');
  room.className = 'room-card';
  room.setAttribute('data-room', state.room);

  room.innerHTML = `
    <h5 class="room-title">${state.title}</h5>
    <ul class="device-list">
      <li class="device-row" data-device="light" data-active="${state.lightOn ? 'on' : 'off'}">
        <span class="device-name">조명</span>
        <div class="state-buttons" role="group" aria-label="${state.title} 조명">
          <button type="button" class="chip-btn" data-action="set-light" data-value="on">ON</button>
          <button type="button" class="chip-btn" data-action="set-light" data-value="off">OFF</button>
        </div>
        <strong class="device-readout">${state.lightOn ? 'ON' : 'OFF'}</strong>
      </li>

      <li class="device-row device-row-ac" data-device="ac" data-power="${state.acOn ? 'on' : 'off'}">
        <span class="device-name">에어컨</span>
        <label class="temp-control">
          온도
          <input
            type="number"
            class="ac-temp-input"
            min="16"
            max="30"
            step="1"
            value="${state.acTemp}"
            inputmode="numeric"
          />
        </label>
        <span class="ac-temp-readout">${state.acTemp}C</span>
        <div class="state-buttons" role="group" aria-label="${state.title} 에어컨">
          <button type="button" class="chip-btn" data-action="set-ac-power" data-value="on">RUNNING</button>
          <button type="button" class="chip-btn" data-action="set-ac-power" data-value="off">STOPPED</button>
        </div>
      </li>

      <li class="device-row" data-device="camera" data-state="${state.cameraState}">
        <span class="device-name">보안카메라</span>
        <div class="state-buttons" role="group" aria-label="${state.title} 카메라">
          <button type="button" class="chip-btn" data-action="set-camera" data-value="recording">녹화중</button>
          <button type="button" class="chip-btn" data-action="set-camera" data-value="idle">대기중</button>
        </div>
        <strong class="device-readout">${state.cameraState === 'recording' ? '녹화중' : '대기중'}</strong>
      </li>
    </ul>
  `;

  syncRoomPresentation(room);
  return room;
}

function createSecurityLogItems() {
  return [
    { id: 'sec-03', text: '13:58 Front door lock checked' },
    { id: 'sec-02', text: '13:46 Kitchen motion detected' },
    { id: 'sec-01', text: '13:40 Living light toggled' },
  ];
}

function getBoard(testRoot) {
  return testRoot.firstElementChild;
}

function getClockParts(board) {
  const clockEl = board.querySelector('[data-field="clock"]');
  if (!clockEl || !clockEl.textContent) return { hour: 14, minute: 0 };
  const [hourRaw, minuteRaw] = clockEl.textContent.split(':');
  return {
    hour: Number.parseInt(hourRaw, 10) || 14,
    minute: Number.parseInt(minuteRaw, 10) || 0,
  };
}

function setButtonState(container, action, activeValue) {
  const buttons = container.querySelectorAll(`button[data-action="${action}"]`);
  for (const button of buttons) {
    const on = button.getAttribute('data-value') === activeValue;
    button.setAttribute('aria-pressed', on ? 'true' : 'false');
    button.classList.toggle('is-active', on);
  }
}

function syncRoomPresentation(room) {
  const lightRow = room.querySelector('[data-device="light"]');
  const acRow = room.querySelector('[data-device="ac"]');
  const cameraRow = room.querySelector('[data-device="camera"]');

  if (lightRow) {
    const value = lightRow.getAttribute('data-active') === 'on' ? 'on' : 'off';
    const readout = lightRow.querySelector('.device-readout');
    if (readout) readout.textContent = value.toUpperCase();
    setButtonState(lightRow, 'set-light', value);
  }

  if (acRow) {
    const power = acRow.getAttribute('data-power') === 'on' ? 'on' : 'off';
    setButtonState(acRow, 'set-ac-power', power);
    const input = acRow.querySelector('.ac-temp-input');
    const readout = acRow.querySelector('.ac-temp-readout');
    if (input && readout) {
      const temp = Number.parseInt(input.value, 10) || 24;
      const safeTemp = Math.max(16, Math.min(30, temp));
      input.value = String(safeTemp);
      input.setAttribute('value', String(safeTemp));
      readout.textContent = `${safeTemp}C`;
    }
  }

  if (cameraRow) {
    const state = cameraRow.getAttribute('data-state') === 'recording' ? 'recording' : 'idle';
    const readout = cameraRow.querySelector('.device-readout');
    if (readout) readout.textContent = state === 'recording' ? '녹화중' : '대기중';
    setButtonState(cameraRow, 'set-camera', state);
  }
}

function syncBoardPresentation(board) {
  const rooms = board.querySelectorAll('.room-card');
  for (const room of rooms) {
    syncRoomPresentation(room);
  }
}

function applyAway(board, enabled) {
  board.setAttribute('data-mode', enabled ? 'away' : 'home');

  const lightRows = board.querySelectorAll('[data-device="light"]');
  const acRows = board.querySelectorAll('[data-device="ac"]');

  for (const light of lightRows) {
    light.setAttribute('data-active', enabled ? 'off' : 'on');
  }
  for (const ac of acRows) {
    ac.setAttribute('data-power', enabled ? 'off' : 'on');
  }

  const energyEl = board.querySelector('[data-field="energy"]');
  if (energyEl) energyEl.textContent = enabled ? '2.9kWh' : '4.2kWh';

  syncBoardPresentation(board);
}

export function createNexusBoard() {
  const board = document.createElement('section');
  board.className = 'nexus-board';
  board.setAttribute('data-mode', 'home');

  const logs = createSecurityLogItems()
    .map((log) => `<li data-key="${log.id}">${log.text}</li>`)
    .join('');

  board.innerHTML = `
    <header class="nexus-header">
      <h4>Nexus Home</h4>
      <div class="header-meta">
        <span><b>Time</b> <strong data-field="clock">14:00</strong></span>
        <span><b>Weather</b> <strong data-field="weather">Sunny 21C</strong></span>
        <span><b>Energy</b> <strong data-field="energy">4.2kWh</strong></span>
      </div>
    </header>
    <div class="room-grid"></div>
    <section class="security-panel">
      <h5>Recent Security Logs</h5>
      <ol class="security-list">${logs}</ol>
    </section>
  `;

  const grid = board.querySelector('.room-grid');
  grid.append(
    createRoomCard({ room: 'living', title: '거실', lightOn: true, acOn: true, acTemp: 24, cameraState: 'recording' }),
    createRoomCard({
      room: 'bedroom',
      title: '침실',
      lightOn: true,
      acOn: true,
      acTemp: 24,
      cameraState: 'idle',
    }),
    createRoomCard({
      room: 'kitchen',
      title: '주방',
      lightOn: true,
      acOn: false,
      acTemp: 22,
      cameraState: 'recording',
    }),
  );

  syncBoardPresentation(board);
  return board;
}

export function bindNexusEditor(testRoot, onStatus) {
  testRoot.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && event.target.tagName !== 'BUTTON') {
      event.preventDefault();
    }
  });

  testRoot.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;

    const board = getBoard(testRoot);
    if (!board) return;

    const row = button.closest('.device-row');
    if (!row) return;

    const action = button.getAttribute('data-action');
    const value = button.getAttribute('data-value');

    if (action === 'set-light') {
      row.setAttribute('data-active', value === 'on' ? 'on' : 'off');
      syncRoomPresentation(row.closest('.room-card'));
      onStatus?.('조명 상태를 수정했습니다. Patch를 누르면 실제 영역에 반영됩니다.');
    }

    if (action === 'set-ac-power') {
      row.setAttribute('data-power', value === 'on' ? 'on' : 'off');
      syncRoomPresentation(row.closest('.room-card'));
      onStatus?.('에어컨 동작 상태를 수정했습니다. Patch를 눌러 반영하세요.');
    }

    if (action === 'set-camera') {
      row.setAttribute('data-state', value === 'recording' ? 'recording' : 'idle');
      syncRoomPresentation(row.closest('.room-card'));
      onStatus?.('카메라 상태를 수정했습니다. Patch를 눌러 반영하세요.');
    }
  });

  testRoot.addEventListener('input', (event) => {
    const input = event.target.closest('.ac-temp-input');
    if (!input) return;
    const board = getBoard(testRoot);
    if (!board) return;

    const row = input.closest('.device-row');
    if (!row) return;

    const value = Number.parseInt(input.value, 10) || 24;
    const safe = Math.max(16, Math.min(30, value));
    input.value = String(safe);
    input.setAttribute('value', String(safe));

    const readout = row.querySelector('.ac-temp-readout');
    if (readout) {
      readout.textContent = `${safe}C`;
      readout.classList.remove('temp-hit');
      void readout.offsetWidth;
      readout.classList.add('temp-hit');
    }

    onStatus?.('에어컨 온도를 수정했습니다. Patch를 눌러 반영하세요.');
  });
}

export function toggleAwayMode(testRoot) {
  const board = getBoard(testRoot);
  if (!board) return false;

  const turnOn = board.getAttribute('data-mode') !== 'away';
  applyAway(board, turnOn);
  return turnOn;
}

export function addOneHour(testRoot) {
  const board = getBoard(testRoot);
  if (!board) return false;

  const clockEl = board.querySelector('[data-field="clock"]');
  const weatherEl = board.querySelector('[data-field="weather"]');
  const energyEl = board.querySelector('[data-field="energy"]');
  if (!clockEl || !weatherEl || !energyEl) return false;

  const { hour, minute } = getClockParts(board);
  const nextHour = (hour + 1) % 24;
  clockEl.textContent = `${twoDigits(nextHour)}:${twoDigits(minute)}`;

  weatherEl.textContent = nextHour >= 18 || nextHour < 6 ? 'Cloudy 18C' : 'Sunny 21C';
  const currentEnergy = Number.parseFloat(energyEl.textContent) || 4.2;
  const nextEnergy = Math.max(2.4, Math.min(6.8, currentEnergy + (nextHour % 2 === 0 ? 0.2 : -0.1)));
  energyEl.textContent = `${nextEnergy.toFixed(1)}kWh`;

  return true;
}
