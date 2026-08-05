(() => {
  "use strict";

  const STORAGE_KEY = "simulacroUnhevalSesionV1";
  const LAST_EXAM_KEY = "simulacroUnhevalUltimoExamenV1";

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];

  const els = {
    screens: $$(".screen"),
    screenInicio: $("#screenInicio"),
    screenIntro: $("#screenIntro"),
    screenExamen: $("#screenExamen"),
    screenResultados: $("#screenResultados"),

    btnInicioHeader: $("#btnInicioHeader"),
    formConfiguracion: $("#formConfiguracion"),
    tipoOptions: $("#tipoOptions"),
    nivelOptions: $("#nivelOptions"),
    configError: $("#configError"),

    resumeCard: $("#resumeCard"),
    resumeTitle: $("#resumeTitle"),
    resumeMeta: $("#resumeMeta"),
    btnContinuarSesion: $("#btnContinuarSesion"),
    btnDescartarSesion: $("#btnDescartarSesion"),

    btnVolverConfig: $("#btnVolverConfig"),
    introBadge: $("#introBadge"),
    introTitle: $("#introTitle"),
    introDescription: $("#introDescription"),
    introMaxScore: $("#introMaxScore"),
    introQuestions: $("#introQuestions"),
    introSections: $("#introSections"),
    introTime: $("#introTime"),
    introSectionsList: $("#introSectionsList"),
    btnIniciarExamen: $("#btnIniciarExamen"),

    examMeta: $("#examMeta"),
    sectionName: $("#sectionName"),
    sectionProgressText: $("#sectionProgressText"),
    timerBox: $("#timerBox"),
    timer: $("#timer"),
    overallProgress: $("#overallProgress"),
    answeredCounter: $("#answeredCounter"),
    questionNavigator: $("#questionNavigator"),
    btnAreaAnterior: $("#btnAreaAnterior"),
    btnAreaSiguiente: $("#btnAreaSiguiente"),

    questionNumber: $("#questionNumber"),
    questionTopic: $("#questionTopic"),
    btnLimpiarRespuesta: $("#btnLimpiarRespuesta"),
    questionText: $("#questionText"),
    alternatives: $("#alternatives"),
    btnPreguntaAnterior: $("#btnPreguntaAnterior"),
    btnPreguntaSiguiente: $("#btnPreguntaSiguiente"),

    resultTitle: $("#resultTitle"),
    resultScore: $("#resultScore"),
    resultScoreMax: $("#resultScoreMax"),
    resultPercent: $("#resultPercent"),
    metricCorrect: $("#metricCorrect"),
    metricWrong: $("#metricWrong"),
    metricBlank: $("#metricBlank"),
    metricTime: $("#metricTime"),
    sectionMetrics: $("#sectionMetrics"),
    topicMetrics: $("#topicMetrics"),
    reviewList: $("#reviewList"),
    btnNuevoSimulacro: $("#btnNuevoSimulacro"),

    modalBackdrop: $("#modalBackdrop"),
    modalTitle: $("#modalTitle"),
    modalMessage: $("#modalMessage"),
    modalCancel: $("#modalCancel"),
    modalConfirm: $("#modalConfirm"),
  };

  const state = {
    catalogo: null,
    seleccion: {
      tipo: null,
      nivel: null,
    },
    examen: null,
    seccionActual: 0,
    preguntaActual: 0,
    respuestas: {},
    inicioMs: null,
    finMs: null,
    endAtMs: null,
    timerId: null,
    finalizado: false,
    ultimoResultado: null,
  };

  let modalResolve = null;

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    bindEvents();

    try {
      state.catalogo = await fetchJson("data/examenes.json");
      renderConfigOptions();
      checkSavedSession();
    } catch (error) {
      console.error(error);
      showConfigError(
        "No se pudieron cargar los archivos JSON. Abre el proyecto con un servidor local, por ejemplo Live Server de VS Code o “python -m http.server”."
      );
    }
  }

  function bindEvents() {
    els.formConfiguracion.addEventListener("submit", onConfigSubmit);
    els.btnVolverConfig.addEventListener("click", () => showScreen("inicio"));
    els.btnIniciarExamen.addEventListener("click", startExam);
    els.btnInicioHeader.addEventListener("click", requestReturnHome);
    els.btnPreguntaAnterior.addEventListener("click", goPreviousQuestion);
    els.btnPreguntaSiguiente.addEventListener("click", goNextQuestion);
    els.btnAreaAnterior.addEventListener("click", () => requestSectionChange(-1));
    els.btnAreaSiguiente.addEventListener("click", () => requestSectionChange(1));
    els.btnLimpiarRespuesta.addEventListener("click", clearCurrentAnswer);
    els.btnNuevoSimulacro.addEventListener("click", resetToHome);
    els.btnContinuarSesion.addEventListener("click", resumeSavedSession);
    els.btnDescartarSesion.addEventListener("click", discardSavedSession);

    els.modalCancel.addEventListener("click", () => closeModal(false));
    els.modalConfirm.addEventListener("click", () => closeModal(true));

    els.modalBackdrop.addEventListener("click", (event) => {
      if (event.target === els.modalBackdrop) {
        closeModal(false);
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !els.modalBackdrop.classList.contains("hidden")) {
        closeModal(false);
      }
    });

    $$(".filter-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        $$(".filter-btn").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        renderReview(btn.dataset.filter);
      });
    });

    window.addEventListener("beforeunload", () => {
      if (state.examen && !state.finalizado) saveSession();
    });
  }

  async function fetchJson(path) {
    const response = await fetch(path, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`No se pudo cargar ${path}: ${response.status}`);
    }
    return response.json();
  }

  function getRandomExam(exams) {
    if (exams.length === 1) {
      return exams[0];
    }

    const lastExam =
      localStorage.getItem(LAST_EXAM_KEY);

    const availableExams = exams.filter(
      exam => exam.archivo !== lastExam
    );

    const randomIndex =
      Math.floor(
        Math.random() * availableExams.length
      );

    const selectedExam =
      availableExams[randomIndex];

    localStorage.setItem(
      LAST_EXAM_KEY,
      selectedExam.archivo
    );

    return selectedExam;
  }

  function getGlobalQuestionNumber() {
    let previousQuestions = 0;

    for (let i = 0; i < state.seccionActual; i++) {
      previousQuestions += state.examen.secciones[i].preguntas.length;
    }

    return previousQuestions + state.preguntaActual + 1;
  }

  function renderConfigOptions() {
    const tipos = uniqueBy(
      state.catalogo.examenes.map((item) => ({
        id: item.tipo,
        label: capitalize(item.tipo),
        description: item.tipo === "preferencial"
          ? "Examen preferencial para 5to de secundaria."
          : "Examen general para todos los niveles.",
      })),
      "id"
    );

    const niveles = [
      { id: "facil", label: "Fácil", description: "Para iniciar práctica." },
      { id: "intermedio", label: "Intermedio", description: "Nivel de práctica medio." },
      { id: "dificil", label: "Difícil", description: "Mayor exigencia." },
    ].filter((nivel) =>
      state.catalogo.examenes.some((exam) => exam.nivel === nivel.id)
    );

    els.tipoOptions.innerHTML = tipos
      .map((item) => choiceTemplate("tipo", item))
      .join("");

    els.nivelOptions.innerHTML = niveles
      .map((item) => choiceTemplate("nivel", item))
      .join("");

    bindChoiceCards();
  }

  function choiceTemplate(group, item) {
    return `
      <label class="choice-card" data-choice-group="${escapeHtml(group)}" data-choice-value="${escapeHtml(item.id)}">
        <input type="radio" name="${escapeHtml(group)}" value="${escapeHtml(item.id)}" />
        <span class="choice-content">
          <strong>${escapeHtml(item.label)}</strong>
          <span>${escapeHtml(item.description)}</span>
        </span>
      </label>
    `;
  }

  function bindChoiceCards() {
    $$(".choice-card").forEach((card) => {
      card.addEventListener("click", () => {
        const group = card.dataset.choiceGroup;
        const value = card.dataset.choiceValue;

        $$(`[data-choice-group="${group}"]`).forEach((c) => c.classList.remove("selected"));
        card.classList.add("selected");
        card.querySelector("input").checked = true;

        state.seleccion[group] = value;
        hideConfigError();
      });
    });
  }

  async function onConfigSubmit(event) {
    event.preventDefault();

    if (!state.seleccion.tipo || !state.seleccion.nivel) {
      showConfigError("Selecciona el tipo de examen y la dificultad.");
      return;
    }

    const availableExams =
      state.catalogo.examenes.filter(
        (item) =>
          item.tipo === state.seleccion.tipo &&
          item.nivel === state.seleccion.nivel
      );

    if (availableExams.length === 0) {
      showConfigError(
        "No existen exámenes configurados para esa combinación."
      );
      return;
    }

    const catalogItem =
      getRandomExam(availableExams);

    try {
      state.examen = await fetchJson(catalogItem.archivo);
      validateExam(state.examen);
      prepareIntro();
      showScreen("intro");
    } catch (error) {
      console.error(error);
      showConfigError(`No se pudo abrir el examen: ${error.message}`);
    }
  }

  function validateExam(exam) {
    if (!exam || !Array.isArray(exam.secciones) || exam.secciones.length === 0) {
      throw new Error("El JSON no contiene secciones válidas.");
    }

    exam.secciones.forEach((section, sectionIndex) => {
      if (!Array.isArray(section.preguntas) || section.preguntas.length === 0) {
        throw new Error(`La sección ${sectionIndex + 1} no tiene preguntas.`);
      }

      section.preguntas.forEach((question, questionIndex) => {
        if (!question.id || !question.pregunta) {
          throw new Error(
            `Pregunta inválida en sección ${sectionIndex + 1}, posición ${questionIndex + 1}.`
          );
        }

        if (!Array.isArray(question.alternativas) || question.alternativas.length < 2) {
          throw new Error(`La pregunta ${question.id} no tiene alternativas suficientes.`);
        }

        if (!question.respuestaCorrecta) {
          throw new Error(`La pregunta ${question.id} no tiene respuestaCorrecta.`);
        }
      });
    });
  }

  function prepareIntro() {
    const totalQuestions = getAllQuestions().length;
    const maxScore = getMaxScore();

    els.introBadge.textContent = `${capitalize(state.examen.tipo || state.seleccion.tipo)} · ${capitalize(state.examen.nivel || state.seleccion.nivel)}`;
    els.introTitle.textContent = state.examen.titulo || "Simulacro";
    els.introDescription.textContent = state.examen.descripcion || "";
    els.introMaxScore.textContent = maxScore.toLocaleString("es-PE");
    els.introQuestions.textContent = totalQuestions;
    els.introSections.textContent = state.examen.secciones.length;
    els.introTime.textContent = `${state.examen.duracionMinutos || 60} min`;

    els.introSectionsList.innerHTML = state.examen.secciones
      .map(
        (section, index) => `
          <div class="section-list-item">
            <strong>${index + 1}. ${escapeHtml(section.nombre)}</strong>
            <span>${section.preguntas.length} preguntas</span>
          </div>
        `
      )
      .join("");
  }

  function startExam() {
    clearTimer();

    state.seccionActual = 0;
    state.preguntaActual = 0;
    state.respuestas = {};
    state.finalizado = false;
    state.ultimoResultado = null;
    state.inicioMs = Date.now();

    const durationMs = (state.examen.duracionMinutos || 60) * 60 * 1000;
    state.endAtMs = state.inicioMs + durationMs;
    state.finMs = null;

    saveSession();
    showScreen("examen");
    renderExam();
    startTimer();
  }

  function renderExam() {
    const section = getCurrentSection();
    const question = getCurrentQuestion();
    const globalQuestionNumber = getGlobalQuestionNumber();
    const totalQuestions = getAllQuestions().length;

    els.questionNumber.textContent =
      `Pregunta ${globalQuestionNumber} de ${totalQuestions}`;

    if (!section || !question) return;

    els.examMeta.textContent = `${capitalize(state.examen.tipo)} · ${capitalize(state.examen.nivel)} · Área ${state.seccionActual + 1} de ${state.examen.secciones.length}`;
    els.sectionName.textContent = section.nombre;

    const answeredInSection = section.preguntas.filter(
      (q) => state.respuestas[q.id]
    ).length;

    els.sectionProgressText.textContent = `${answeredInSection} de ${section.preguntas.length} respondidas`;
    els.answeredCounter.textContent = `${answeredInSection} / ${section.preguntas.length} respondidas`;

    els.questionTopic.textContent = question.tema || "Sin tema";
    els.questionText.textContent = question.pregunta;

    renderAlternatives(question);
    renderQuestionNavigator(section);
    updateExamButtons();
    updateOverallProgress();
    saveSession();
  }

  function renderAlternatives(question) {
    const selected = state.respuestas[question.id] || null;

    els.alternatives.innerHTML = question.alternativas
      .map(
        (alt) => `
          <button
            type="button"
            class="alternative ${selected === alt.id ? "selected" : ""}"
            data-alt-id="${escapeHtml(alt.id)}"
          >
            <span class="alt-letter">${escapeHtml(alt.id)}</span>
            <span class="alt-text">${escapeHtml(alt.texto)}</span>
          </button>
        `
      )
      .join("");

    $$(".alternative").forEach((button) => {
      button.addEventListener("click", () => {
        state.respuestas[question.id] = button.dataset.altId;
        renderExam();
      });
    });
  }

  function renderQuestionNavigator(section) {
    const offset = state.examen.secciones
      .slice(0, state.seccionActual)
      .reduce(
        (total, currentSection) =>
          total + currentSection.preguntas.length,
        0
      );
    els.questionNavigator.innerHTML = section.preguntas
      .map((question, index) => {
        const isCurrent = index === state.preguntaActual;
        const isAnswered = Boolean(state.respuestas[question.id]);
        const classes = [
          "question-nav-btn",
          isAnswered ? "answered" : "",
          isCurrent ? "current" : "",
        ]
          .filter(Boolean)
          .join(" ");

        return `
          <button
            type="button"
            class="${classes}"
            data-question-index="${index}"
            aria-label="Ir a pregunta ${offset + index + 1}"
          >
            ${offset + index + 1}
          </button>
        `;
      })
      .join("");

    $$(".question-nav-btn").forEach((button) => {
      button.addEventListener("click", () => {
        state.preguntaActual = Number(button.dataset.questionIndex);
        renderExam();
      });
    });
  }

  function updateExamButtons() {
    const section = getCurrentSection();
    const isFirstQuestion = state.preguntaActual === 0;
    const isLastQuestion = state.preguntaActual === section.preguntas.length - 1;
    const isFirstSection = state.seccionActual === 0;
    const isLastSection = state.seccionActual === state.examen.secciones.length - 1;

    els.btnPreguntaAnterior.disabled = isFirstQuestion;
    els.btnPreguntaSiguiente.textContent = isLastQuestion
      ? isLastSection
        ? "Finalizar examen"
        : "Pasar a siguiente área →"
      : "Siguiente →";

    els.btnAreaAnterior.disabled = isFirstSection;
    els.btnAreaSiguiente.textContent = isLastSection
      ? "Finalizar examen"
      : "Siguiente área →";
  }

  function updateOverallProgress() {
    const allQuestions = getAllQuestions();
    const answered = allQuestions.filter((q) => state.respuestas[q.id]).length;
    const percent = allQuestions.length ? (answered / allQuestions.length) * 100 : 0;
    els.overallProgress.style.width = `${percent}%`;
  }

  function goPreviousQuestion() {
    if (state.preguntaActual > 0) {
      state.preguntaActual -= 1;
      renderExam();
    }
  }

  async function goNextQuestion() {
    const section = getCurrentSection();
    const isLastQuestion = state.preguntaActual === section.preguntas.length - 1;
    const isLastSection = state.seccionActual === state.examen.secciones.length - 1;

    if (!isLastQuestion) {
      state.preguntaActual += 1;
      renderExam();
      return;
    }

    if (!isLastSection) {
      await requestSectionChange(1);
      return;
    }

    await requestFinishExam();
  }

  async function requestSectionChange(direction) {
    const newIndex = state.seccionActual + direction;

    if (direction < 0) {
      if (newIndex >= 0) {
        state.seccionActual = newIndex;
        state.preguntaActual = 0;
        renderExam();
      }
      return;
    }

    const isLastSection = state.seccionActual === state.examen.secciones.length - 1;
    if (isLastSection) {
      await requestFinishExam();
      return;
    }

    const section = getCurrentSection();
    const pending = section.preguntas.filter((q) => !state.respuestas[q.id]);

    if (pending.length > 0) {
      const confirmed = await openModal({
        title: "Hay preguntas pendientes",
        message: `
          <p>Tienes <strong>${pending.length}</strong> pregunta${pending.length === 1 ? "" : "s"} sin responder en <strong>${escapeHtml(section.nombre)}</strong>.</p>
          <p>¿Deseas pasar a la siguiente área de todas formas?</p>
        `,
        confirmText: "Continuar",
        cancelText: "Seguir revisando",
      });

      if (!confirmed) return;
    }

    state.seccionActual = newIndex;
    state.preguntaActual = 0;
    renderExam();
  }

  async function requestFinishExam(forceByTime = false) {
    if (!state.examen || state.finalizado) return;

    if (!forceByTime) {
      const pendingBySection = state.examen.secciones
        .map((section) => ({
          nombre: section.nombre,
          cantidad: section.preguntas.filter((q) => !state.respuestas[q.id]).length,
        }))
        .filter((item) => item.cantidad > 0);

      let message = `<p>Después de finalizar no podrás modificar tus respuestas.</p>`;

      if (pendingBySection.length > 0) {
        message = `
          <p>Tienes preguntas sin responder:</p>
          <ul>
            ${pendingBySection
            .map(
              (item) =>
                `<li><strong>${escapeHtml(item.nombre)}:</strong> ${item.cantidad}</li>`
            )
            .join("")}
          </ul>
          <p>¿Deseas finalizar de todas formas?</p>
        `;
      }

      const confirmed = await openModal({
        title: "Finalizar examen",
        message,
        confirmText: "Finalizar examen",
        cancelText: "Volver al examen",
      });

      if (!confirmed) return;
    }

    finishExam(forceByTime);
  }

  function finishExam(forceByTime = false) {
    state.finalizado = true;
    state.finMs = forceByTime ? state.endAtMs : Date.now();
    clearTimer();

    state.ultimoResultado = calculateResults();
    localStorage.removeItem(STORAGE_KEY);

    renderResults();
    showScreen("resultados");
  }

  function calculateResults() {
    const rows = [];
    let score = 0;
    let correct = 0;
    let wrong = 0;
    let blank = 0;
    let globalNumber = 0;

    state.examen.secciones.forEach((section) => {
      section.preguntas.forEach((question) => {

        globalNumber++;
        const userAnswer = state.respuestas[question.id] || null;
        const isBlank = !userAnswer;
        const isCorrect = userAnswer === question.respuestaCorrecta;

        if (isBlank) blank += 1;
        else if (isCorrect) correct += 1;
        else wrong += 1;

        if (isCorrect) score += Number(question.puntaje || 0);

        rows.push({
          numero: globalNumber,
          sectionId: section.id,
          sectionName: section.nombre,
          question,
          userAnswer,
          isBlank,
          isCorrect
        });
      });
    });

    const maxScore = getMaxScore();
    const total = rows.length;
    const percent = maxScore > 0
      ? (score / maxScore) * 100
      : total > 0
        ? (correct / total) * 100
        : 0;

    return {
      rows,
      score,
      maxScore,
      correct,
      wrong,
      blank,
      total,
      percent,
      elapsedMs: Math.max(0, (state.finMs || Date.now()) - state.inicioMs),
    };
  }

  function renderResults() {
    const result = state.ultimoResultado;
    if (!result) return;

    els.resultTitle.textContent = state.examen.titulo || "Resultado";
    els.resultScore.textContent = formatNumber(result.score);
    els.resultScoreMax.textContent = `/ ${formatNumber(result.maxScore)} puntos`;
    els.resultPercent.textContent = `${result.percent.toFixed(1)}%`;

    els.metricCorrect.textContent = result.correct;
    els.metricWrong.textContent = result.wrong;
    els.metricBlank.textContent = result.blank;
    els.metricTime.textContent = formatDuration(result.elapsedMs);

    renderSectionMetrics(result);
    renderTopicMetrics(result);

    $$(".filter-btn").forEach((b) => b.classList.remove("active"));
    $('.filter-btn[data-filter="all"]').classList.add("active");
    renderReview("all");
  }

  function renderSectionMetrics(result) {
    const metrics = state.examen.secciones.map((section) => {
      const rows = result.rows.filter((row) => row.sectionId === section.id);
      const correct = rows.filter((row) => row.isCorrect).length;
      const percent = rows.length ? (correct / rows.length) * 100 : 0;

      return {
        name: section.nombre,
        correct,
        total: rows.length,
        percent,
      };
    });

    els.sectionMetrics.innerHTML = metrics
      .map(
        (metric) => `
          <div class="metric-row">
            <div class="metric-row-head">
              <strong>${escapeHtml(metric.name)}</strong>
              <span>${metric.correct}/${metric.total} · ${metric.percent.toFixed(0)}%</span>
            </div>
            <div class="metric-track">
              <div class="metric-fill" style="width:${metric.percent}%"></div>
            </div>
            <span class="metric-note">${performanceLabel(metric.percent)}</span>
          </div>
        `
      )
      .join("");
  }

  function renderTopicMetrics(result) {
    const map = new Map();

    result.rows.forEach((row) => {
      const topic = row.question.tema || "Sin tema";

      if (!map.has(topic)) {
        map.set(topic, { topic, correct: 0, total: 0 });
      }

      const item = map.get(topic);
      item.total += 1;
      if (row.isCorrect) item.correct += 1;
    });

    const topics = [...map.values()]
      .map((item) => ({
        ...item,
        percent: item.total ? (item.correct / item.total) * 100 : 0,
      }))
      .sort((a, b) => a.percent - b.percent || a.topic.localeCompare(b.topic));

    els.topicMetrics.innerHTML = topics.length
      ? topics
        .map((item) => {
          const status = performanceClass(item.percent);
          return `
              <div class="topic-row">
                <strong>${escapeHtml(item.topic)}</strong>
                <span>${item.correct}/${item.total} · ${item.percent.toFixed(0)}%</span>
                <span class="topic-status ${status}">${performanceLabel(item.percent)}</span>
              </div>
            `;
        })
        .join("")
      : `<p class="empty-state">No hay temas configurados.</p>`;
  }

  function renderReview(filter = "all") {
    const result = state.ultimoResultado;
    if (!result) return;

    let rows = result.rows;

    if (filter === "wrong") rows = rows.filter((row) => !row.isCorrect && !row.isBlank);
    if (filter === "blank") rows = rows.filter((row) => row.isBlank);

    if (rows.length === 0) {
      els.reviewList.innerHTML = `<p class="empty-state">No hay preguntas para este filtro.</p>`;
      return;
    }

    els.reviewList.innerHTML = rows
      .map((row, index) => {
        const status = row.isCorrect ? "correct" : row.isBlank ? "blank" : "wrong";
        const statusText = row.isCorrect ? "Correcta" : row.isBlank ? "Sin responder" : "Incorrecta";

        const userText = getAlternativeText(row.question, row.userAnswer);
        const correctText = getAlternativeText(row.question, row.question.respuestaCorrecta);

        const explanation =
          !row.isCorrect
            ? `
              <div class="explanation">
                <strong>Explicación</strong>
                <span>${escapeHtml(row.question.explicacion || "Esta pregunta todavía no tiene una explicación configurada en el JSON.")}</span>
              </div>
            `
            : "";

        return `
          <article class="review-card ${status}">
            <div class="review-title">
              <div>
                <strong>Pregunta ${row.numero}</strong>
              </div>
              <span class="status-pill ${status}">${statusText}</span>
            </div>

            <p class="review-question">${escapeHtml(row.question.pregunta)}</p>

            <div class="answer-lines">
              <span>Tu respuesta: <strong>${escapeHtml(userText || "Sin responder")}</strong></span>
              <span>Respuesta correcta: <strong>${escapeHtml(correctText || row.question.respuestaCorrecta)}</strong></span>
            </div>

            ${explanation}
          </article>
        `;
      })
      .join("");
  }

  function getAlternativeText(question, id) {
    if (!id) return "";
    const alt = question.alternativas.find((item) => item.id === id);
    return alt ? `${alt.id}. ${alt.texto}` : id;
  }

  function clearCurrentAnswer() {
    const question = getCurrentQuestion();
    if (!question) return;

    delete state.respuestas[question.id];
    renderExam();
  }

  function startTimer() {
    clearTimer();
    updateTimer();
    state.timerId = window.setInterval(updateTimer, 1000);
  }

  function updateTimer() {
    if (!state.endAtMs || state.finalizado) return;

    const remaining = state.endAtMs - Date.now();

    if (remaining <= 0) {
      els.timer.textContent = "00:00";
      clearTimer();
      requestFinishExam(true);
      return;
    }

    els.timer.textContent = formatDuration(remaining, true);
    els.timerBox.classList.toggle("danger", remaining <= 5 * 60 * 1000);
  }

  function clearTimer() {
    if (state.timerId) {
      clearInterval(state.timerId);
      state.timerId = null;
    }
  }

  function saveSession() {
    if (!state.examen || state.finalizado) return;

    const payload = {
      examenId: state.examen.id,
      examen: state.examen,
      seleccion: state.seleccion,
      seccionActual: state.seccionActual,
      preguntaActual: state.preguntaActual,
      respuestas: state.respuestas,
      inicioMs: state.inicioMs,
      endAtMs: state.endAtMs,
      finalizado: false,
      savedAt: Date.now(),
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }

  function checkSavedSession() {
    const saved = readSavedSession();
    if (!saved || !saved.examen || saved.finalizado) return;

    if (saved.endAtMs && Date.now() >= saved.endAtMs) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }

    els.resumeCard.classList.remove("hidden");
    els.resumeTitle.textContent = saved.examen.titulo || "Simulacro pendiente";
    els.resumeMeta.textContent = `${capitalize(saved.examen.tipo || saved.seleccion?.tipo || "")} · ${capitalize(saved.examen.nivel || saved.seleccion?.nivel || "")}`;
  }

  function readSavedSession() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
  }

  function resumeSavedSession() {
    const saved = readSavedSession();
    if (!saved) return;

    state.examen = saved.examen;
    state.seleccion = saved.seleccion || {
      tipo: saved.examen.tipo,
      nivel: saved.examen.nivel,
    };
    state.seccionActual = Number(saved.seccionActual || 0);
    state.preguntaActual = Number(saved.preguntaActual || 0);
    state.respuestas = saved.respuestas || {};
    state.inicioMs = saved.inicioMs || Date.now();
    state.endAtMs = saved.endAtMs;
    state.finalizado = false;

    els.resumeCard.classList.add("hidden");
    showScreen("examen");
    renderExam();
    startTimer();
  }

  function discardSavedSession() {
    localStorage.removeItem(STORAGE_KEY);
    els.resumeCard.classList.add("hidden");
  }

  async function requestReturnHome() {
    if (state.examen && !state.finalizado) {
      const confirmed = await openModal({
        title: "Salir del simulacro",
        message:
          "<p>Tu progreso está guardado en este navegador. Puedes volver a la pantalla inicial y continuar después.</p>",
        confirmText: "Ir al inicio",
        cancelText: "Seguir en examen",
      });

      if (!confirmed) return;
      saveSession();
    }

    showScreen("inicio");
    checkSavedSession();
  }

  function resetToHome() {
    clearTimer();
    localStorage.removeItem(STORAGE_KEY);

    state.examen = null;
    state.seccionActual = 0;
    state.preguntaActual = 0;
    state.respuestas = {};
    state.inicioMs = null;
    state.finMs = null;
    state.endAtMs = null;
    state.finalizado = false;
    state.ultimoResultado = null;

    els.resumeCard.classList.add("hidden");
    showScreen("inicio");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function showScreen(name) {
    const map = {
      inicio: els.screenInicio,
      intro: els.screenIntro,
      examen: els.screenExamen,
      resultados: els.screenResultados,
    };

    els.screens.forEach((screen) => screen.classList.add("hidden"));
    map[name].classList.remove("hidden");

    els.btnInicioHeader.classList.toggle("hidden", name === "inicio");

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function getCurrentSection() {
    return state.examen?.secciones?.[state.seccionActual] || null;
  }

  function getCurrentQuestion() {
    return getCurrentSection()?.preguntas?.[state.preguntaActual] || null;
  }

  function getAllQuestions() {
    return state.examen?.secciones?.flatMap((section) => section.preguntas) || [];
  }

  function getMaxScore() {
    if (!state.examen) return 0;

    const explicit = Number(state.examen.puntajeMaximo);
    if (Number.isFinite(explicit) && explicit > 0) return explicit;

    return getAllQuestions().reduce(
      (sum, question) => sum + Number(question.puntaje || 0),
      0
    );
  }

  function formatDuration(ms, compact = false) {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    }

    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  function formatNumber(value) {
    return Number(value || 0).toLocaleString("es-PE", {
      maximumFractionDigits: 2,
    });
  }

  function performanceLabel(percent) {
    if (percent >= 80) return "Buen dominio";
    if (percent >= 60) return "Debe reforzarse";
    return "Prioridad de estudio";
  }

  function performanceClass(percent) {
    if (percent >= 80) return "good";
    if (percent >= 60) return "medium";
    return "low";
  }

  function capitalize(value = "") {
    const text = String(value);
    return text ? text.charAt(0).toUpperCase() + text.slice(1) : "";
  }

  function uniqueBy(items, key) {
    const seen = new Set();
    return items.filter((item) => {
      if (seen.has(item[key])) return false;
      seen.add(item[key]);
      return true;
    });
  }

  function showConfigError(message) {
    els.configError.textContent = message;
    els.configError.classList.remove("hidden");
  }

  function hideConfigError() {
    els.configError.classList.add("hidden");
  }

  function openModal({
    title,
    message,
    confirmText = "Continuar",
    cancelText = "Cancelar",
  }) {
    els.modalTitle.textContent = title;
    els.modalMessage.innerHTML = message;
    els.modalConfirm.textContent = confirmText;
    els.modalCancel.textContent = cancelText;
    els.modalBackdrop.classList.remove("hidden");

    return new Promise((resolve) => {
      modalResolve = resolve;
    });
  }

  function closeModal(value) {
    if (els.modalBackdrop.classList.contains("hidden")) return;

    els.modalBackdrop.classList.add("hidden");

    if (modalResolve) {
      const resolve = modalResolve;
      modalResolve = null;
      resolve(value);
    }
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
})();
