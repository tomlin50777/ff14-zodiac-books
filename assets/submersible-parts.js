(function (root) {
  'use strict';
  // Existing persisted builds use numeric IDs in hull / stern / bow / bridge order.
  const catalog = Object.freeze([
    { id: '1', code: 'S', name: 'Shark', local: '鯊魚' },
    { id: '2', code: 'U', name: 'Unkiu', local: '甲鱟' },
    { id: '3', code: 'W', name: 'Whale', local: '鬚鯨' },
    { id: '4', code: 'C', name: 'Coelacanth', local: '腔棘魚' },
    { id: '5', code: 'Y', name: 'Syldra', local: '希爾德拉' }
  ].map(Object.freeze));
  const slots = Object.freeze(['船體', '船尾', '船首', '艦橋']);
  const aliases = new Map();
  catalog.forEach(part => [part.id, part.code, part.name, part.local].forEach(alias => aliases.set(alias.toLowerCase(), part)));
  const invalid = error => ({ valid: false, build: '', letters: '', modifiedMarks: [], error });

  function parse(value) {
    const input = String(value == null ? '' : value).normalize('NFKC').trim();
    if (!input) return invalid('請選好四個部位，或輸入四碼數字、英文代碼／名稱。');
    if (/\+\s*\+/.test(input)) return invalid('不接受 ++ 尾綴簡寫。請把單一 + 放在要改型的零件後，例如 W+ S U C，或直接勾選下方改型。');
    let tokens;
    if (/^(?:[1-5suwcy]\+?){4}$/i.test(input)) {
      tokens = input.match(/[1-5suwcy]\+?/gi);
    } else {
      tokens = input.split(/[\s,，/／;；|｜-]+/).filter(Boolean);
    }
    if (tokens.length !== 4) return invalid('需要完整四個零件，依序為船體、船尾、船首、艦橋；例如 3113、WSSW 或 Whale Shark Shark Whale。');
    const found = [], modifiedMarks = [];
    for (let index = 0; index < tokens.length; index++) {
      const token = tokens[index];
      const marked = token.endsWith('+');
      const part = aliases.get((marked ? token.slice(0, -1) : token).toLowerCase());
      if (!part) return invalid('第 ' + (index + 1) + ' 位（' + slots[index] + '）無法辨識。請用 1～5、S/U/W/C/Y 或完整英文名稱，也可直接下拉選擇。');
      found.push(part);
      modifiedMarks.push(marked ? true : null);
    }
    return { valid: true, build: found.map(part => part.id).join(''), letters: found.map(part => part.code).join(''), modifiedMarks, error: '' };
  }

  function createEditor(doc, onChange) {
    const input = doc.querySelector('#ship-build');
    const selects = slots.map((_, index) => doc.querySelector('#ship-part-' + index));
    const modified = slots.map((_, index) => doc.querySelector('#ship-modified-' + index));
    const feedback = doc.querySelector('#ship-build-feedback');
    let lastInput = null, current = invalid('請選好四個部位。');
    selects.forEach(select => {
      const empty = doc.createElement('option');
      empty.value = ''; empty.textContent = '請選擇零件';
      select.appendChild(empty);
      catalog.forEach(part => {
        const option = doc.createElement('option');
        option.value = part.id;
        option.textContent = part.id + ' / ' + part.code + ' · ' + part.local + '級';
        select.appendChild(option);
      });
      select.addEventListener('change', () => {
        const values = selects.map(field => field.value);
        input.value = values.map((value, index) => (value || '?') + (modified[index].checked ? '+' : '')).join(values.every(Boolean) ? '' : ' ');
        // Keep explicit partial dropdown selections. Never fill missing slots from an old build.
        lastInput = input.value;
        current = parse(input.value);
        onChange();
      });
    });

    function render() {
      input.setCustomValidity(current.valid ? '' : current.error);
      input.setAttribute('aria-invalid', String(!current.valid));
      selects.forEach(select => select.setAttribute('aria-invalid', String(!current.valid && !select.value)));
      feedback.textContent = current.valid ? '' : current.error;
      feedback.hidden = current.valid;

    }

    function syncFromInput() {
      if (input.value !== lastInput) {
        lastInput = input.value;
        current = parse(input.value);
        selects.forEach((select, index) => { select.value = current.valid ? current.build[index] : ''; });
        if (current.valid) current.modifiedMarks.forEach((mark, index) => { modified[index].checked = mark === true; });
      }
      render();
      return current;
    }

    function writeQuickInput() {
      input.value = selects.map((select, index) => (select.value || '?') + (modified[index].checked ? '+' : '')).join(selects.every(select => select.value) ? '' : ' ');
      lastInput = input.value;
      current = parse(input.value);
    }

    function modifiedChanged() {
      // Preserve incomplete selections while keeping each modified flag visible in quick input.
      writeQuickInput();
    }

    function reset() {
      // Saved builds store modified flags separately. Do not erase them while opening the editor.
      current = parse(input.value);
      selects.forEach((select, index) => { select.value = current.valid ? current.build[index] : ''; });
      writeQuickInput();
      render();
      return current;
    }
    return { syncFromInput, modifiedChanged, reset };
  }
  root.SubParts = Object.freeze({ catalog, slots, parse, createEditor });
})(typeof window !== 'undefined' ? window : globalThis);
