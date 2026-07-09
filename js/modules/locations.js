import { $ } from '../utils/dom.js';

export async function loadLocations() {
  const departamento = $('#departamento');
  const ciudad = $('#ciudad');
  if (!departamento || !ciudad) return;

  try {
    const res = await fetch('/data/locations.json');
    const data = await res.json();
    populateDepartamentos(departamento, data);
    departamento.addEventListener('change', () => {
      populateCiudades(ciudad, data, departamento.value);
    });
  } catch (err) {
    console.warn('Error cargando locations:', err);
  }
}

function populateDepartamentos(select, data) {
  const deptos = Object.keys(data).sort();
  select.innerHTML = '<option value="">Selecciona tu departamento</option>';
  deptos.forEach((d) => {
    const opt = document.createElement('option');
    opt.value = d;
    opt.textContent = d;
    select.appendChild(opt);
  });
}

function populateCiudades(select, data, depto) {
  select.innerHTML = '<option value="">Selecciona tu ciudad</option>';
  if (!depto || !data[depto]) return;
  select.disabled = false;
  data[depto].sort().forEach((c) => {
    const opt = document.createElement('option');
    opt.value = c;
    opt.textContent = c;
    select.appendChild(opt);
  });
}
