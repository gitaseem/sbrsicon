/** Registration and abstract validation, submission, and dialog lifecycle. */
(function(){
"use strict";
// config.js and countries.js populate these values before this deferred script runs.
var $ = window.SBRS.select, $$ = window.SBRS.selectAll;
var FORM_ENDPOINT = window.SBRS.formEndpoint, FORM_MAILTO = window.SBRS.formMailto;
var COUNTRIES = window.SBRS.countryRows;

(function initForms(){
  var list = COUNTRIES.split(";").map(function(r){var x=r.split("|");return {iso:x[0],dial:x[1],name:x[2]};});

  $$("select[data-country]").forEach(function(sel){
    var frag = document.createDocumentFragment();
    list.forEach(function(c){
      var o = document.createElement("option");
      o.value = c.name; o.textContent = c.name + " (+" + c.dial + ")";
      o.setAttribute("data-dial", c.dial);
      frag.appendChild(o);
    });
    sel.appendChild(frag);
    sel.addEventListener("change", function(){
      var pfx = sel.id.split("-")[0];
      var dial = sel.selectedOptions[0] && sel.selectedOptions[0].getAttribute("data-dial");
      var box = document.getElementById(pfx + "-dial");
      if(box) box.textContent = dial ? "+" + dial : "+\u2014";
    });
  });

  function setErr(field, msg){
    var wrap = field.closest(".f"), box = document.getElementById("e-" + field.id);
    if(msg){
      wrap.classList.add("bad");
      field.setAttribute("aria-invalid","true");
      if(box){ box.textContent = msg; field.setAttribute("aria-describedby", box.id); }
    }else{
      wrap.classList.remove("bad");
      field.removeAttribute("aria-invalid");
      if(box) box.textContent = "";
    }
    return !msg;
  }

  var EMAIL = /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/;

  function validateField(el){
    var v = (el.value || "").trim();
    if(el.hasAttribute("data-req") && !v)
      return setErr(el, el.tagName === "SELECT" ? "Please choose one" : "This field is required");
    if(!v) return setErr(el, "");
    if(el.type === "email" && !EMAIL.test(v))
      return setErr(el, "Enter a valid email address");
    if(el.hasAttribute("data-phone")){
      var digits = v.replace(/\D/g, "");
      var sel = document.getElementById(el.id.split("-")[0] + "-country");
      var dial = sel && sel.selectedOptions[0] ? (sel.selectedOptions[0].getAttribute("data-dial")||"") : "";
      if(!dial) return setErr(el, "Choose your country first");
      if(digits.length < 4)  return setErr(el, "Number looks too short");
      if(digits.length > 14) return setErr(el, "Number looks too long");
      if((dial + digits).length > 15) return setErr(el, "Too long for an international number");
    }
    if(el.name === "abstract"){
      var words = v.split(/\s+/).filter(Boolean).length;
      if(words > 300) return setErr(el, "Abstract is " + words + " words \u2014 maximum is 300");
      if(words < 20)  return setErr(el, "Please write at least 20 words");
    }
    return setErr(el, "");
  }

  function fields(form){
    return $$("input,select,textarea", form).filter(function(el){
      return el.name && el.name !== "website" && el.type !== "submit";
    });
  }

  function collect(form){
    var out = {}, sel = $("select[data-country]", form);
    var dial = sel && sel.selectedOptions[0] ? sel.selectedOptions[0].getAttribute("data-dial") : "";
    fields(form).forEach(function(el){ out[el.name] = (el.value||"").trim(); });
    if(out.phone) out.phone = "+" + dial + " " + out.phone.replace(/\D/g,"");
    out.form = form.getAttribute("data-kind");
    out.submitted_at = new Date().toISOString();
    out.page = location.href;
    return out;
  }

  function mailtoFallback(data){
    var lines = Object.keys(data).map(function(k){ return k + ": " + data[k]; }).join("\n");
    var subject = data.form === "abstract"
      ? "SBRS ICON 2027 \u2014 Abstract Submission"
      : "SBRS ICON 2027 \u2014 Registration";
    return "mailto:" + FORM_MAILTO + "?subject=" + encodeURIComponent(subject) +
           "&body=" + encodeURIComponent(lines);
  }

  $$("form[data-kind]").forEach(function(form){
    var status = $(".dlg-status", form), btn = $("button[type=submit]", form);

    fields(form).forEach(function(el){
      el.addEventListener("blur", function(){ validateField(el); });
      el.addEventListener("input", function(){
        if(el.closest(".f").classList.contains("bad")) validateField(el);
        // clear the summary once nothing is outstanding, so a stale count never lingers
        if(status.className.indexOf("bad")>-1 && !$$(".f.bad", form).length){
          status.textContent=""; status.className="dlg-status";
        }
      });
    });

    form.addEventListener("submit", function(ev){
      ev.preventDefault();
      if(form.website && form.website.value) return;          // honeypot

      var bad = fields(form).filter(function(el){ return !validateField(el); });
      if(bad.length){
        status.textContent = bad.length + " field" + (bad.length>1?"s":"") + " need attention";
        status.className = "dlg-status bad";
        bad[0].focus();
        return;
      }

      var data = collect(form);
      status.className = "dlg-status";
      status.textContent = "Sending\u2026";
      btn.disabled = true;

      function ok(){
        status.className = "dlg-status ok";
        status.textContent = "Received \u2014 we will be in touch by email.";
        form.reset();
        $$(".dial", form).forEach(function(d){ d.textContent = "+\u2014"; });
        btn.disabled = false;
      }
      function fail(){
        status.className = "dlg-status bad";
        status.innerHTML = 'Could not send. <a href="' + mailtoFallback(data) + '">Send it by email instead</a>';
        btn.disabled = false;
      }

      if(!FORM_ENDPOINT){ window.location.href = mailtoFallback(data); ok(); return; }

      var body = new URLSearchParams();
      Object.keys(data).forEach(function(k){ body.append(k, data[k]); });
      fetch(FORM_ENDPOINT, { method:"POST", body:body })
        .then(function(r){ if(!r.ok) throw new Error(r.status); return r.text(); })
        .then(ok)
        .catch(fail);
    });
  });

  /* ---- open / close ---- */
  var lastTrigger = null;
  var DLG = { register: "#dlgRegister", abstract: "#dlgAbstract" };

  $$("[data-open]").forEach(function(a){
    a.addEventListener("click", function(ev){
      var d = $(DLG[a.getAttribute("data-open")]);
      if(!d || !d.showModal) return;                          // no <dialog>: mailto href runs
      ev.preventDefault();
      lastTrigger = a;
      d.showModal();
      document.documentElement.style.overflow = "hidden";
      var first = $("input,select,textarea", d);
      if(first) setTimeout(function(){ first.focus(); }, 60);
    });
  });

  $$("dialog.dlg").forEach(function(d){
    function shut(){
      d.close();
      document.documentElement.style.overflow = "";
      if(lastTrigger) lastTrigger.focus();
    }
    $$("[data-close]", d).forEach(function(b){ b.addEventListener("click", shut); });
    d.addEventListener("cancel", function(ev){ ev.preventDefault(); shut(); });
    d.addEventListener("click", function(ev){ if(ev.target === d) shut(); });
  });
})();
})();
