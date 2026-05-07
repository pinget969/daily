/*
 * Daily Manager - Spec-Driven Development (SDD)
 * Fuente de verdad funcional + especificacion ejecutable.
 *
 * Este archivo define:
 * 1) Requerimientos funcionales
 * 2) Escenarios BDD/Gherkin
 * 3) Estructura de datos esperada
 * 4) Pruebas unitarias ligeras con console.assert()
 *
 * Ejecucion recomendada:
 *   window.RUN_DAILY_SPEC = true
 *   (recargar pagina)
 */

(function dailyManagerSpecScope() {
    "use strict";

    const SPEC_VERSION = "1.3.0";

    // ------------------------------------------------------------
    // 1) REQUERIMIENTOS FUNCIONALES
    // ------------------------------------------------------------
    const FUNCTIONAL_REQUIREMENTS = [
        {
            id: "RF-01",
            title: "Inicio de Daily",
            description: "Al iniciar la Daily se debe crear una cola con participantes activos (no excluidos), agregar un item final de Parking Lot, resetear timers de sesion y cambiar la vista a modo activo."
        },
        {
            id: "RF-02",
            title: "Gestion de tiempo por integrante",
            description: "Cada speaker tiene un cronometro individual con cambios de estado visual por umbral y el sistema debe permitir pausar/reanudar sin perder continuidad."
        },
        {
            id: "RF-03",
            title: "Registro de resumen final",
            description: "Cada intervencion debe registrarse con tiempo y estado (tarde, bloqueante/isDelayed, skip) y al finalizar se calculan metricas globales (total, promedio, fastest, slowest)."
        },
        {
            id: "RF-04",
            title: "Persistencia de participantes",
            description: "La lista de participantes debe mantenerse en localStorage bajo la clave daily-participants."
        },
        {
            id: "RF-05",
            title: "Trazabilidad de pausas",
            description: "La aplicacion debe registrar cantidad de pausas y tiempo total en pausa durante la Daily, y mostrar ambas metricas en el resumen. La pausa solo debe detener el tiempo del speaker, no el tiempo total de la reunion."
        },
        {
            id: "RF-06",
            title: "Demora de inicio",
            description: "La Daily debe tener un horario pactado configurable (09:30 por defecto) y calcular la demora real entre el horario pactado y la hora efectiva de inicio."
        },
        {
            id: "RF-07",
            title: "Pausa por participante",
            description: "Cada participante debe registrar su tiempo individual en pausa y mostrarse en el resumen al lado de su fila, sin afectar la clasificacion."
        },
        {
            id: "RF-08",
            title: "Textos contextuales de avance",
            description: "El boton de avance debe indicar 'Preguntas' al pasar del ultimo participante a Parking Lot, y 'Finalizar' dentro de Parking Lot."
        },
        {
            id: "RF-09",
            title: "Inicio anticipado",
            description: "Si la reunion inicia antes del horario pactado, la metrica debe mostrarse como inicio anticipado, no como demora."
        }
    ];

    // ------------------------------------------------------------
    // 2) CASOS BDD / GHERKIN
    // ------------------------------------------------------------
    const BDD_GHERKIN_SCENARIOS = [
        {
            id: "BDD-01",
            feature: "Gestion de participantes",
            scenario: [
                "Given que estoy en la vista de setup",
                "And no existe un participante llamado 'Ana'",
                "When agrego un nuevo participante con nombre 'Ana'",
                "Then la lista de participantes incrementa en 1",
                "And 'Ana' se guarda con estados por defecto",
                "And el estado persiste en localStorage"
            ]
        },
        {
            id: "BDD-02",
            feature: "Cronometro de intervencion",
            scenario: [
                "Given que la Daily esta iniciada y hay un speaker activo",
                "When transcurren 61 segundos de intervencion",
                "Then el estado visual del speaker pasa a warning",
                "When transcurren mas de 120 segundos",
                "Then el estado visual del speaker pasa a danger",
                "And el progreso no supera 100%"
            ]
        },
        {
            id: "BDD-03",
            feature: "Marcado de bloqueantes",
            scenario: [
                "Given que hay un speaker activo",
                "When marco el speaker con estado bloqueante",
                "Then el sistema debe registrar dicho estado usando isDelayed",
                "And al guardar resultado el estado bloqueante se refleja en el resumen"
            ]
        },
        {
            id: "BDD-04",
            feature: "Control de pausas",
            scenario: [
                "Given que la Daily esta en ejecucion",
                "When pauso y luego reanudo la reunion",
                "Then se incrementa la cantidad de pausas",
                "And se acumula el tiempo pausado",
                "And ambas metricas aparecen en el resumen final"
            ]
        },
        {
            id: "BDD-05",
            feature: "Hora pactada e inicio real",
            scenario: [
                "Given que el horario pactado es 09:30",
                "When inicio la Daily a las 09:40",
                "Then la demora de inicio debe ser 00:10",
                "And la demora debe mostrarse en el resumen"
            ]
        },
        {
            id: "BDD-06",
            feature: "Pausa por participante",
            scenario: [
                "Given que un participante esta exponiendo",
                "When la reunion se pausa y luego se reanuda durante su turno",
                "Then se acumula pauseTime para ese participante",
                "And su clasificacion se calcula solo por time y estados, no por pauseTime"
            ]
        },
        {
            id: "BDD-07",
            feature: "Flujo de boton siguiente",
            scenario: [
                "Given que estoy en la ultima persona de la ronda",
                "When aun no entre a Parking Lot",
                "Then el boton debe decir 'Preguntas'",
                "When entro a Parking Lot",
                "Then el boton debe decir 'Finalizar'"
            ]
        },
        {
            id: "BDD-08",
            feature: "Inicio anticipado",
            scenario: [
                "Given que el horario pactado es 09:30",
                "When inicio la Daily a las 09:20",
                "Then la diferencia debe mostrarse como inicio anticipado",
                "And no debe etiquetarse como demora en iniciar"
            ]
        }
    ];

    // ------------------------------------------------------------
    // 3) ESTRUCTURA DE DATOS (CONTRATO JSON)
    // ------------------------------------------------------------
    const DAILY_MANAGER_DATA_SCHEMA = {
        participant: {
            id: "string",
            name: "string",
            isLate: "boolean",
            isDelayed: "boolean", // Equivale a "bloqueante" en el dominio actual
            excludeFromRotation: "boolean",
            status: "pending | active | done | skipped"
        },
        queueItem: {
            id: "string",
            name: "string",
            isLate: "boolean",
            isDelayed: "boolean",
            isParkingLot: "boolean?"
        },
        result: {
            name: "string",
            time: "number (seconds)",
            pauseTime: "number (seconds)",
            isLate: "boolean",
            isDelayed: "boolean",
            skipped: "boolean",
            isParkingLot: "boolean?"
        },
        persistedStorage: {
            key: "daily-participants",
            value: "participant[]"
        },
        meetingMeta: {
            plannedStartTime: "string (HH:mm)",
            actualStartTimestamp: "number (epoch ms)",
            startDelaySeconds: "number",
            pauseCount: "number",
            totalPauseSeconds: "number"
        }
    };

    const DATA_EXAMPLE = {
        participants: [
            {
                id: "1715160600000",
                name: "Nelson",
                isLate: false,
                isDelayed: false,
                excludeFromRotation: false,
                status: "pending"
            }
        ],
        currentQueue: [
            {
                id: "1715160600000",
                name: "Nelson",
                isLate: false,
                isDelayed: false
            },
            {
                id: "parking-lot",
                name: "Preguntas / Parking Lot",
                isLate: false,
                isDelayed: false,
                isParkingLot: true
            }
        ],
        results: [
            {
                name: "Nelson",
                time: 54,
                pauseTime: 12,
                isLate: false,
                isDelayed: true,
                skipped: false,
                isParkingLot: false
            }
        ],
        meetingMeta: {
            plannedStartTime: "09:30",
            actualStartTimestamp: 1715161200000,
            startDelaySeconds: 600,
            pauseCount: 2,
            totalPauseSeconds: 45
        }
    };

    // ------------------------------------------------------------
    // 4) PRUEBAS UNITARIAS LIGERAS
    // ------------------------------------------------------------
    function createRunner() {
        const state = { pass: 0, fail: 0 };

        function assert(condition, message) {
            console.assert(condition, message);
            if (condition) state.pass += 1;
            else state.fail += 1;
        }

        function test(name, fn) {
            try {
                fn();
                console.log("[SPEC PASS]", name);
            } catch (err) {
                state.fail += 1;
                console.error("[SPEC ERROR]", name, err);
            }
        }

        function summary() {
            console.group("Daily Manager SDD Summary");
            console.log("Version:", SPEC_VERSION);
            console.log("Pass:", state.pass);
            console.log("Fail:", state.fail);
            console.log("Functional Requirements:", FUNCTIONAL_REQUIREMENTS);
            console.log("BDD Scenarios:", BDD_GHERKIN_SCENARIOS);
            console.log("Data Schema:", DAILY_MANAGER_DATA_SCHEMA);
            console.log("Data Example:", DATA_EXAMPLE);
            console.groupEnd();
        }

        return { assert, test, summary, state };
    }

    function runDailySpec() {
        if (typeof window.app === "undefined") {
            console.error("[SPEC] No se encontro window.app. Asegura que app.js cargue antes del spec.");
            return;
        }

        const t = createRunner();
        const app = window.app;

        const backup = {
            participants: JSON.parse(JSON.stringify(app.participants || [])),
            currentQueue: JSON.parse(JSON.stringify(app.currentQueue || [])),
            results: JSON.parse(JSON.stringify(app.results || [])),
            currentIndex: app.currentIndex,
            globalTimerSeconds: app.globalTimerSeconds,
            speakerTimerSeconds: app.speakerTimerSeconds,
            isPaused: app.isPaused,
            pauseBtnHtml: app.btns && app.btns.pause ? app.btns.pause.innerHTML : "",
            storage: localStorage.getItem("daily-participants"),
            plannedStorage: localStorage.getItem("daily-planned-start-time"),
            pauseCount: app.pauseCount,
            totalPauseSeconds: app.totalPauseSeconds,
            pauseStartedAt: app.pauseStartedAt,
            currentSpeakerPauseSeconds: app.currentSpeakerPauseSeconds,
            plannedStartTime: app.plannedStartTime,
            actualStartTimestamp: app.actualStartTimestamp,
            startDelaySeconds: app.startDelaySeconds
        };

        function restoreState() {
            clearInterval(app.globalInterval);
            clearInterval(app.speakerInterval);
            app.participants = backup.participants;
            app.currentQueue = backup.currentQueue;
            app.results = backup.results;
            app.currentIndex = backup.currentIndex;
            app.globalTimerSeconds = backup.globalTimerSeconds;
            app.speakerTimerSeconds = backup.speakerTimerSeconds;
            app.isPaused = backup.isPaused;
            app.pauseCount = backup.pauseCount;
            app.totalPauseSeconds = backup.totalPauseSeconds;
            app.pauseStartedAt = backup.pauseStartedAt;
            app.currentSpeakerPauseSeconds = backup.currentSpeakerPauseSeconds;
            app.plannedStartTime = backup.plannedStartTime;
            app.actualStartTimestamp = backup.actualStartTimestamp;
            app.startDelaySeconds = backup.startDelaySeconds;
            if (app.btns && app.btns.pause) app.btns.pause.innerHTML = backup.pauseBtnHtml;
            if (backup.storage === null) localStorage.removeItem("daily-participants");
            else localStorage.setItem("daily-participants", backup.storage);
            if (backup.plannedStorage === null) localStorage.removeItem("daily-planned-start-time");
            else localStorage.setItem("daily-planned-start-time", backup.plannedStorage);
            if (app.displays && app.displays.plannedStartInput) {
                app.displays.plannedStartInput.value = app.plannedStartTime || "09:30";
            }
            app.renderParticipantList();
        }

        t.test("RF-04 | Agregar participante con defaults y persistencia", () => {
            app.participants = [];
            const originalDateNow = Date.now;
            Date.now = () => 111;
            try {
                app.addParticipant("Ana");
            } finally {
                Date.now = originalDateNow;
            }

            const p = app.participants[0];
            t.assert(app.participants.length === 1, "Debe agregarse 1 participante");
            t.assert(p.id === "111", "El id del participante debe serializarse como string");
            t.assert(p.name === "Ana", "El nombre del participante debe mantenerse");
            t.assert(p.isLate === false, "isLate debe iniciar en false");
            t.assert(p.isDelayed === false, "isDelayed (bloqueante) debe iniciar en false");
            t.assert(p.excludeFromRotation === false, "excludeFromRotation debe iniciar en false");
            t.assert(p.status === "pending", "status debe iniciar en pending");

            const persisted = JSON.parse(localStorage.getItem("daily-participants") || "[]");
            t.assert(Array.isArray(persisted) && persisted.length === 1, "Debe persistirse la lista en localStorage");
        });

        t.test("RF-01 | startDaily construye cola activa y agrega parking-lot", () => {
            app.participants = [
                { id: "1", name: "A", isLate: false, isDelayed: false, excludeFromRotation: false, status: "pending" },
                { id: "2", name: "B", isLate: false, isDelayed: false, excludeFromRotation: true, status: "pending" }
            ];
            app.startDaily();

            t.assert(app.currentQueue.length === 2, "Cola debe incluir 1 participante activo + parking-lot");
            t.assert(app.currentQueue[app.currentQueue.length - 1].id === "parking-lot", "Ultimo item debe ser parking-lot");
            t.assert(app.currentQueue.some((q) => q.id === "1"), "Participante activo debe estar en cola");
            t.assert(!app.currentQueue.some((q) => q.id === "2"), "Participante excluido no debe estar en cola");
            t.assert(app.currentIndex === 0, "Indice actual debe reiniciar en 0");
        });

        t.test("RF-02 | Cronometro speaker aplica umbrales warning/danger", () => {
            app.speakerTimerSeconds = 61;
            app.updateSpeakerTimerDisplay();
            const card = document.getElementById("speaker-card");
            t.assert(card.classList.contains("warning"), "A los 61s debe entrar en warning");

            app.speakerTimerSeconds = 121;
            app.updateSpeakerTimerDisplay();
            t.assert(card.classList.contains("danger"), "A los 121s debe entrar en danger");

            const progress = card.style.getPropertyValue("--speaker-progress").trim();
            t.assert(progress === "100%", "El progreso visual debe topearse al 100%");
        });

        t.test("BDD-03 | Bloqueante se representa con isDelayed y se registra en resultados", () => {
            app.currentQueue = [{ id: "1", name: "Ana", isLate: false, isDelayed: false }];
            app.currentIndex = 0;
            app.results = [];
            app.speakerTimerSeconds = 35;
            app.currentSpeakerPauseSeconds = 7;

            app.toggleSpeakerStatus("isDelayed");
            t.assert(app.currentQueue[0].isDelayed === true, "Marcar bloqueante debe activar isDelayed");

            app.recordResult(false);
            t.assert(app.results.length === 1, "Debe existir un resultado registrado");
            t.assert(app.results[0].isDelayed === true, "El resultado debe conservar estado bloqueante/isDelayed");
            t.assert(app.results[0].time === 35, "El resultado debe guardar tiempo de intervencion");
            t.assert(app.results[0].pauseTime === 7, "El resultado debe guardar tiempo de pausa individual");
        });

        t.test("RF-03 | Metricas finales (total, promedio, fastest, slowest)", () => {
            app.globalTimerSeconds = 180;
            app.pauseCount = 2;
            app.totalPauseSeconds = 40;
            app.startDelaySeconds = 300;
            app.results = [
                { name: "Ana", time: 20, skipped: false, isParkingLot: false, isLate: false, isDelayed: false },
                { name: "Luis", time: 80, skipped: false, isParkingLot: false, isLate: false, isDelayed: false },
                { name: "Parking", time: 10, skipped: false, isParkingLot: true, isLate: false, isDelayed: false },
                { name: "Ausente", time: 0, skipped: true, isParkingLot: false, isLate: false, isDelayed: false }
            ];

            app.calculateMetrics();

            t.assert(app.displays.statTotal.textContent === "03:00", "Tiempo total debe ser 03:00");
            t.assert(app.displays.statAvg.textContent === "00:50", "Promedio debe considerar solo participantes validos");
            t.assert(app.displays.statFastest.textContent === "Ana", "Fastest esperado: Ana");
            t.assert(app.displays.statSlowest.textContent === "Luis", "Slowest esperado: Luis");
            t.assert(app.displays.statPauseCount.textContent === "2", "Debe mostrarse cantidad de pausas");
            t.assert(app.displays.statPauseTime.textContent === "00:40", "Debe mostrarse tiempo pausado");
            t.assert(app.displays.statStartDelay.textContent === "05:00", "Debe mostrarse demora de inicio");
        });

        t.test("RF-05 | togglePause registra cantidad y tiempo de pausa", () => {
            const originalDateNow = Date.now;
            app.pauseCount = 0;
            app.totalPauseSeconds = 0;
            app.pauseStartedAt = null;
            app.currentSpeakerPauseSeconds = 0;
            app.isPaused = false;

            Date.now = () => 1000;
            app.togglePause(); // pausa
            t.assert(app.pauseCount === 1, "Al pausar debe incrementarse pauseCount");
            t.assert(app.isPaused === true, "El estado debe quedar pausado");

            Date.now = () => 6000;
            app.togglePause(); // reanuda
            t.assert(app.isPaused === false, "Al reanudar debe desactivarse isPaused");
            t.assert(app.totalPauseSeconds === 5, "Debe acumularse tiempo pausado en segundos");
            t.assert(app.currentSpeakerPauseSeconds === 5, "Debe acumularse pausa del speaker actual");

            Date.now = originalDateNow;
        });

        t.test("RF-05 | La pausa no detiene el cronometro global", () => {
            const originalSetInterval = window.setInterval;
            let tickFn = null;
            window.setInterval = (fn) => {
                tickFn = fn;
                return 999;
            };

            app.globalTimerSeconds = 0;
            app.isPaused = true;
            app.startGlobalTimer();
            if (typeof tickFn === "function") {
                tickFn();
                tickFn();
            }

            t.assert(app.globalTimerSeconds === 2, "El tiempo total debe seguir avanzando aunque la daily este pausada");

            window.setInterval = originalSetInterval;
            clearInterval(app.globalInterval);
        });

        t.test("RF-06 | Demora de inicio segun horario pactado", () => {
            app.plannedStartTime = "09:30";
            const actual = new Date("2026-05-07T09:40:00").getTime();
            const delay = app.calculateStartDelaySeconds(actual);
            t.assert(delay === 600, "La demora debe ser 600 segundos (10 minutos)");
        });

        t.test("RF-09 | Inicio antes de horario pactado retorna delta negativo", () => {
            app.plannedStartTime = "09:30";
            const actual = new Date("2026-05-07T09:20:00").getTime();
            const delay = app.calculateStartDelaySeconds(actual);
            t.assert(delay === -600, "Si se inicia antes, la diferencia debe ser negativa");
        });

        t.test("RF-07 | pauseTime por participante no altera clasificacion", () => {
            const shortWithPause = app.getClassification({
                time: 30,
                pauseTime: 120,
                isLate: false,
                isDelayed: false,
                skipped: false,
                isParkingLot: false
            });

            t.assert(shortWithPause.text === "Speedrun", "La clasificacion debe depender del tiempo de exposicion");
            t.assert(shortWithPause.emoji.includes("⚡"), "La clasificacion no debe degradarse por pauseTime");
        });

        t.test("RF-08 | Etiqueta del boton de avance segun contexto", () => {
            app.currentQueue = [
                { id: "1", name: "A", isLate: false, isDelayed: false },
                { id: "parking-lot", name: "Preguntas / Parking Lot", isLate: false, isDelayed: false, isParkingLot: true }
            ];

            app.currentIndex = 0;
            app.updateNextButtonLabel(app.currentQueue[0]);
            t.assert(app.btns.next.textContent.includes("Preguntas"), "En ultima persona debe decir Preguntas");

            app.currentIndex = 1;
            app.updateNextButtonLabel(app.currentQueue[1]);
            t.assert(app.btns.next.textContent.includes("Finalizar"), "En parking lot debe decir Finalizar");
        });

        t.summary();
        restoreState();
    }

    // Exponer documento de especificacion para inspeccion desde consola.
    window.DAILY_MANAGER_SPEC = {
        version: SPEC_VERSION,
        requirements: FUNCTIONAL_REQUIREMENTS,
        scenarios: BDD_GHERKIN_SCENARIOS,
        dataSchema: DAILY_MANAGER_DATA_SCHEMA,
        dataExample: DATA_EXAMPLE,
        run: runDailySpec
    };

    // Ejecuta solo cuando se habilita explicitamente desde index.html o consola.
    if (window.RUN_DAILY_SPEC === true) {
        runDailySpec();
    } else {
        console.info("[SPEC] daily-manager.spec.js cargado. Activa window.RUN_DAILY_SPEC = true para ejecutar pruebas.");
    }
})();
