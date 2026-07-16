(function () {
  "use strict";

  const UNIDADES = ["Alagoinhas","Barreiras","Camaçari","Candeias","Dendezeiros","Eunápolis",
    "Feira de Santana","Ilhéus","Jacobina","Jequié","Juazeiro","Lauro de Freitas",
    "Luís Eduardo Magalhães","Ourolândia","Santo Antônio de Jesus","Senhor do Bonfim",
    "Serrinha","Teixeira de Freitas","Vitória da Conquista",
    "Unidade Teste (não usar em produção)"];

  const AREAS = ["Tecnologia da Informação","Eletrotécnica","Automação","Eletromecânica","Refrigeração",
    "Construção Civil","Edificações","Química","Biotecnologia","Microbiologia","Petroquímica",
    "Química e Alimentos","Segurança do Trabalho","EMI","Logística","Mecatrônica","Alimentos",
    "Agroindústria","Biblioteca","Infraestrutura Geral","Outra (especificar)"];

  const $ = (sel) => document.querySelector(sel);

  function show(id) {
    ["screenLogin", "screenTrocarSenha", "screenForm"].forEach((s) => {
      $("#" + s).style.display = s === id ? "block" : "none";
    });
  }

  function fillSelect(sel, options) {
    options.forEach((o) => {
      const opt = document.createElement("option");
      opt.value = o;
      opt.textContent = o;
      sel.appendChild(opt);
    });
  }

  async function api(path, opts) {
    const res = await fetch(path, Object.assign({ credentials: "include", headers: { "Content-Type": "application/json" } }, opts));
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.erro || "Erro na requisição.");
    return data;
  }

  async function checkSession() {
    try {
      const me = await api("/api/me");
      $("#userGreeting").textContent = "Olá, " + me.nome;
      $("#btnLogout").style.display = "inline-block";
      show("screenForm");
      initForm();
      loadRecent();
    } catch (e) {
      $("#userGreeting").textContent = "";
      $("#btnLogout").style.display = "none";
      show("screenLogin");
    }
  }

  function initForm() {
    if ($("#fUnidade").dataset.filled) return;
    fillSelect($("#fUnidade"), UNIDADES);
    fillSelect($("#fArea"), AREAS);
    $("#fUnidade").dataset.filled = "1";
  }

  async function loadRecent() {
    const box = $("#recentList");
    try {
      const data = await api("/api/minhas-respostas");
      if (!data.itens.length) {
        box.innerHTML = '<p style="color:var(--muted);font-size:13px">Nenhum item registrado ainda.</p>';
        return;
      }
      box.innerHTML = data.itens
        .map(
          (it) => `<div class="reg-recent">
            <b>${escapeHtml(it.unidade)} — ${escapeHtml(it.area_tecnica)}</b>
            <small>${escapeHtml(it.descricao_item)} · ${it.data_visita ? it.data_visita.substring(0, 10) : ""} · ${escapeHtml(it.status)}</small>
          </div>`
        )
        .join("");
    } catch (e) {
      box.innerHTML = '<p style="color:var(--muted);font-size:13px">Não foi possível carregar os registros.</p>';
    }
  }

  function escapeHtml(s) {
    if (s == null) return "";
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  $("#btnLogin").addEventListener("click", async () => {
    const msg = $("#loginMsg");
    msg.style.display = "none";
    try {
      const data = await api("/api/login", {
        method: "POST",
        body: JSON.stringify({ email: $("#loginEmail").value.trim(), senha: $("#loginSenha").value }),
      });
      if (data.precisa_trocar_senha) {
        show("screenTrocarSenha");
      } else {
        checkSession();
      }
    } catch (e) {
      msg.textContent = e.message;
      msg.style.display = "block";
    }
  });

  $("#btnTrocarSenha").addEventListener("click", async () => {
    const msg = $("#trocarMsg");
    msg.style.display = "none";
    try {
      await api("/api/trocar-senha", {
        method: "POST",
        body: JSON.stringify({ senha_atual: $("#senhaAtual").value, nova_senha: $("#senhaNova").value }),
      });
      checkSession();
    } catch (e) {
      msg.textContent = e.message;
      msg.style.display = "block";
    }
  });

  $("#btnLogout").addEventListener("click", async () => {
    await api("/api/logout", { method: "POST" });
    checkSession();
  });

  function resetItemFields() {
    ["fAcompNome", "fAcompCargo", "fDescricao", "fObservado", "fBoaPratica", "fOportunidade", "fResponsavel", "fPrazo"].forEach(
      (id) => ($("#" + id).value = "")
    );
    document.querySelectorAll('input[name="fStatus"]').forEach((r) => (r.checked = false));
    // Ano, Unidade, Data e Área ficam preenchidos — normalmente vários itens seguidos são
    // da mesma visita/área, então só a "Descrição do item" e o resto muda a cada envio.
  }

  $("#btnNovoItem").addEventListener("click", resetItemFields);

  $("#btnSalvarItem").addEventListener("click", async () => {
    const msg = $("#formMsg");
    msg.className = "reg-msg";
    msg.style.display = "none";

    const status = document.querySelector('input[name="fStatus"]:checked');
    const body = {
      ano: $("#fAno").value,
      unidade: $("#fUnidade").value,
      data_visita: $("#fData").value,
      area_tecnica: $("#fArea").value,
      acompanhante_nome: $("#fAcompNome").value,
      acompanhante_cargo: $("#fAcompCargo").value,
      descricao_item: $("#fDescricao").value,
      observado: $("#fObservado").value,
      boa_pratica: $("#fBoaPratica").value,
      oportunidade: $("#fOportunidade").value,
      responsavel_acao: $("#fResponsavel").value,
      prazo: $("#fPrazo").value,
      status: status ? status.value : "",
    };

    try {
      await api("/api/registrar-item", { method: "POST", body: JSON.stringify(body) });
      msg.textContent = "Item registrado com sucesso.";
      msg.classList.add("success");
      msg.style.display = "block";
      resetItemFields();
      loadRecent();
    } catch (e) {
      msg.textContent = e.message;
      msg.classList.add("error");
      msg.style.display = "block";
    }
  });

  checkSession();
})();
