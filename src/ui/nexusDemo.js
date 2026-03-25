function createRoomCard(state) {
  const room = document.createElement('article');
  room.className = 'room-card';
  room.setAttribute('data-room', state.room);

  room.innerHTML = `
    <h5 class="room-title" draggable="true" data-drag-handle="true">${state.title}</h5>
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

function getBoard(testRoot) {
  return testRoot.firstElementChild;
}

function getRoomGrid(testRoot) {
  return getBoard(testRoot)?.querySelector('.room-grid') ?? null;
}

function roomOrder(grid) {
  return Array.from(grid.querySelectorAll('.room-card[data-room]')).map((card) => card.getAttribute('data-room') ?? '');
}

function bindRoomDnD(testRoot, handlers = {}) {
  const { onStatus, onChange } = handlers;
  let draggingCard = null;
  let dropSlot = null;
  let startOrder = '';

  const clearDnD = (grid) => {
    if (dropSlot) {
      dropSlot.remove();
      dropSlot = null;
    }
    if (draggingCard) {
      draggingCard.classList.remove('is-dragging', 'is-drag-hidden');
      draggingCard = null;
    }
    if (grid) {
      grid.classList.remove('is-sorting');
    }
  };

  const finalizeDrop = () => {
    if (!draggingCard) return;
    const grid = getRoomGrid(testRoot);
    const beforeOrder = startOrder;

    if (grid && dropSlot && dropSlot.parentElement === grid) {
      grid.insertBefore(draggingCard, dropSlot);
    }

    const endOrder = grid ? roomOrder(grid).join('|') : beforeOrder;
    clearDnD(grid);

    if (beforeOrder !== endOrder) {
      onStatus?.('카드 순서를 변경했습니다. Patch를 눌러 반영하세요.');
      onChange?.();
    }
  };

  testRoot.addEventListener('dragstart', (event) => {
    const handle = event.target.closest('[data-drag-handle="true"]');
    if (!handle) return;

    const card = handle.closest('.room-card');
    const grid = getRoomGrid(testRoot);
    if (!card || !grid) return;

    draggingCard = card;
    startOrder = roomOrder(grid).join('|');
    dropSlot = document.createElement('article');
    dropSlot.className = 'room-card room-drop-slot';
    dropSlot.setAttribute('aria-hidden', 'true');
    dropSlot.style.height = `${card.getBoundingClientRect().height}px`;
    grid.insertBefore(dropSlot, card.nextElementSibling);

    draggingCard.classList.add('is-dragging');
    grid.classList.add('is-sorting');
    setTimeout(() => {
      draggingCard?.classList.add('is-drag-hidden');
    }, 0);

    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', card.getAttribute('data-room') ?? '');
    }
  });

  testRoot.addEventListener('dragover', (event) => {
    if (!draggingCard) return;
    const grid = getRoomGrid(testRoot);
    if (!grid || !dropSlot) return;

    event.preventDefault();
    const hovered = event.target.closest('.room-card');

    if (!hovered || hovered === draggingCard) {
      if (grid.lastElementChild !== dropSlot) {
        grid.appendChild(dropSlot);
      }
      return;
    }

    if (hovered === dropSlot) return;

    const rect = hovered.getBoundingClientRect();
    const insertBefore = event.clientY < rect.top + rect.height / 2;
    const anchor = insertBefore ? hovered : hovered.nextElementSibling;
    if (anchor !== dropSlot) {
      grid.insertBefore(dropSlot, anchor);
    }
  });

  testRoot.addEventListener('drop', (event) => {
    if (!draggingCard) return;
    event.preventDefault();
    finalizeDrop();
  });

  testRoot.addEventListener('dragend', () => {
    finalizeDrop();
  });
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
      readout.textContent = power === 'on' ? `${safeTemp}C` : 'OFF';
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

export function bindNexusEditor(testRoot, handlers = {}) {
  const { onStatus, onChange } = handlers;

  bindRoomDnD(testRoot, handlers);

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
      onChange?.();
    }

    if (action === 'set-ac-power') {
      row.setAttribute('data-power', value === 'on' ? 'on' : 'off');
      syncRoomPresentation(row.closest('.room-card'));
      onStatus?.('에어컨 동작 상태를 수정했습니다. Patch를 눌러 반영하세요.');
      onChange?.();
    }

    if (action === 'set-camera') {
      row.setAttribute('data-state', value === 'recording' ? 'recording' : 'idle');
      syncRoomPresentation(row.closest('.room-card'));
      onStatus?.('카메라 상태를 수정했습니다. Patch를 눌러 반영하세요.');
      onChange?.();
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
      const isPowerOn = row.getAttribute('data-power') === 'on';
      readout.textContent = isPowerOn ? `${safe}C` : 'OFF';
      readout.classList.remove('temp-hit');
      void readout.offsetWidth;
      readout.classList.add('temp-hit');
    }

    onStatus?.('에어컨 온도를 수정했습니다. Patch를 눌러 반영하세요.');
    onChange?.();
  });
}

export function toggleAwayMode(testRoot) {
  const board = getBoard(testRoot);
  if (!board) return false;

  const turnOn = board.getAttribute('data-mode') !== 'away';
  applyAway(board, turnOn);
  return turnOn;
}
