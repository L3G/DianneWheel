// Editor panel — manages the option list UI
// ============================================
// Renders the entry list, handles add/remove/toggle/reorder.
// Uses native HTML drag-and-drop for reordering.

import { state } from './state.js';
import { PALETTE } from './utils.js';

const listEl = () => document.getElementById('options-list');
const addInput = () => document.getElementById('add-option-input');
const addBtn = () => document.getElementById('add-option-btn');
const countEl = () => document.getElementById('option-count');
const clearBtn = () => document.getElementById('clear-all-btn');
const resetBtn = () => document.getElementById('reset-sample-btn');

let dragSrcIndex = null;

export function initEditor() {
  // Add option on button click
  addBtn().addEventListener('click', handleAdd);

  // Add option on Enter key
  addInput().addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  });

  // Bulk actions
  clearBtn().addEventListener('click', () => {
    if (state.options.length === 0) return;
    if (confirm('Remove all options?')) {
      state.clearAllOptions();
    }
  });

  resetBtn().addEventListener('click', () => {
    if (confirm('Reset to sample options? Current options will be replaced.')) {
      state.resetToSample();
    }
  });

  // Listen for state changes
  state.subscribe(() => renderList());
}

function handleAdd() {
  const input = addInput();
  const entry = state.addOption(input.value);
  if (entry) {
    input.value = '';
    input.focus();
  }
}

export function renderList() {
  const list = listEl();
  const count = countEl();
  if (!list) return;

  count.textContent = `${state.enabledOptions.length} active / ${state.options.length} total`;

  list.innerHTML = '';

  state.options.forEach((opt, index) => {
    const item = document.createElement('div');
    item.className = `option-item ${opt.enabled ? '' : 'disabled'}`;
    item.draggable = true;
    item.dataset.index = index;

    const color = opt.color || PALETTE[index % PALETTE.length];

    item.innerHTML = `
      <div class="option-drag-handle" title="Drag to reorder">⠿</div>
      <input type="color" class="option-color" value="${color}" title="Set color">
      <input type="text" class="option-label" value="${escapeAttr(opt.label)}"
             aria-label="Option label" maxlength="50">
      <button class="option-toggle ${opt.enabled ? 'on' : 'off'}"
              title="${opt.enabled ? 'Disable' : 'Enable'}" aria-label="Toggle option">
        ${opt.enabled ? '✓' : '✗'}
      </button>
      <button class="option-remove" title="Remove" aria-label="Remove option">×</button>
    `;

    // Event listeners
    const labelInput = item.querySelector('.option-label');
    labelInput.addEventListener('change', () => {
      state.updateOption(opt.id, { label: labelInput.value.trim() || opt.label });
    });

    const colorInput = item.querySelector('.option-color');
    colorInput.addEventListener('input', () => {
      state.updateOption(opt.id, { color: colorInput.value });
    });

    item.querySelector('.option-toggle').addEventListener('click', () => {
      state.toggleOption(opt.id);
    });

    item.querySelector('.option-remove').addEventListener('click', () => {
      state.removeOption(opt.id);
    });

    // Drag-and-drop reordering
    item.addEventListener('dragstart', (e) => {
      dragSrcIndex = index;
      item.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });

    item.addEventListener('dragend', () => {
      item.classList.remove('dragging');
      dragSrcIndex = null;
      // Remove all drag-over highlights
      list.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
    });

    item.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      item.classList.add('drag-over');
    });

    item.addEventListener('dragleave', () => {
      item.classList.remove('drag-over');
    });

    item.addEventListener('drop', (e) => {
      e.preventDefault();
      item.classList.remove('drag-over');
      const toIndex = parseInt(item.dataset.index, 10);
      if (dragSrcIndex !== null && dragSrcIndex !== toIndex) {
        state.reorderOptions(dragSrcIndex, toIndex);
      }
    });

    list.appendChild(item);
  });
}

function escapeAttr(str) {
  return str.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
