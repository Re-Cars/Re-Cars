 /* ----------------------------------------------------
/                   ELENCO VEICOLI                     /
-----------------------------------------------------*/

async function renderListaVeicoli() {
    const container = document.getElementById('vl-lista-veicoli');
    if (!container) return;

    if (!veicoli || veicoli.length === 0) {
        container.innerHTML = `
            <div class="vl-empty">
                <i class="fa-solid fa-car-side"></i>
                Nessun veicolo registrato.<br>Aggiungi il tuo primo veicolo per iniziare.
            </div>
        `;
        return;
    }

    container.innerHTML = '';

    for (let i = 0; i < veicoli.length; i++) {
        const v = veicoli[i];
        const iconClass = v.tipo === 'motorcycle' ? 'fa-motorcycle' : 'fa-car';

        const row = document.createElement('div');
        row.className = 'vl-veicolo-row' + (i === veicoloAttivoIndex ? ' attivo' : '');
        row.style.animationDelay = `${i * 0.07}s`;
        row.innerHTML = `
            <div class="vl-icon"><i class="fa-solid ${iconClass}"></i></div>
            <div class="vl-info">
                <div class="vl-nome">${v.nome}</div>
                <div class="vl-meta">
                    <span class="vl-targa">${v.targa}</span>
                    <span class="vl-tipo vl-tipo-extra-${v.id}">Caricamento...</span>
                </div>
            </div>
            <div class="vl-stato" id="vl-stato-${v.id}"></div>
            <div class="vl-actions">
                <button class="vl-icon-btn" title="Info veicolo" onclick="vaiAInfoVeicolo(${i})">
                    <i class="fa-solid fa-circle-info"></i>
                </button>
                <button class="vl-icon-btn del" title="Elimina veicolo" onclick="mostraConfermaElimina(${v.id}, '${v.nome}')">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
        `;

        row.addEventListener('click', (e) => {
            if (e.target.closest('.vl-actions')) return;
            selezionaVeicolo(i);
            renderListaVeicoli();
        });

        container.appendChild(row);
        caricaDettagliVeicolo(v.id);
    }
}

async function caricaDettagliVeicolo(id) {
    try {
        const response = await fetch(`http://localhost:3000/veicolo/${id}`, {
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include'
        });

        if (!response.ok) return;

        const v = await response.json();
        const dg = v.dati_generici[0] || {};
        const ds = v.dati_specifici[0] || {};

        const extraEl = document.querySelector(`.vl-tipo-extra-${id}`);
        if (extraEl) {
            const anno = ds.dataimmatricolazione ? new Date(ds.dataimmatricolazione).getFullYear() : '-';
            extraEl.textContent = `${dg.tipo_veicolo || 'Autovettura'} · ${anno}`;
        }

        const statoEl = document.getElementById(`vl-stato-${id}`);
        if (statoEl) {
            const bolloOk = !!ds.isbolloattivo;
            const rcaOk = !!ds.isinsured;
            statoEl.innerHTML = `
                <span class="vl-badge ${bolloOk ? 'ok' : 'ko'}"><i class="fa-solid ${bolloOk ? 'fa-circle-check' : 'fa-circle-xmark'}"></i> Bollo</span>
                <span class="vl-badge ${rcaOk ? 'ok' : 'ko'}"><i class="fa-solid fa-shield-halved"></i> RCA</span>
            `;
        }
    } catch (err) {
        console.error('Errore nel caricamento dettagli veicolo', id, err);
    }
}

function vaiAInfoVeicolo(index) {
    selezionaVeicolo(index);
    window.location.href = 'info-veicolo.html';
}

 /* ----------------------------------------------------
/                      AVVIO                           /
-----------------------------------------------------*/
document.addEventListener('DOMContentLoaded', async () => {
    await caricaVeicoli();
    renderListaVeicoli();
});