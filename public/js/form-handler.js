// form-handler.js
document.addEventListener("DOMContentLoaded", () => {
  const forms = document.querySelectorAll("form[data-form-handler]");

  forms.forEach((form) => {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      const submitBtn =
        form.querySelector('button[type="submit"], input[type="submit"]') ||
        form.querySelector("button");

      const defaultButtonLabel =
        (submitBtn &&
          (submitBtn.textContent?.trim() || submitBtn.value?.trim())) ||
        "Send Message";

      if (submitBtn) {
        submitBtn.disabled = true;
        if ("textContent" in submitBtn) submitBtn.textContent = "Sending...";
        if ("value" in submitBtn) submitBtn.value = "Sending...";
      }

      const successMessage =
        form.getAttribute("data-success") || "Message sent!";
      const errorMessage =
        form.getAttribute("data-error") || "Something went wrong.";
      const endpoint =
        form.getAttribute("data-api") ||
        form.getAttribute("action") ||
        "/form-submit";

      try {
        const body = {};

        form.querySelectorAll("input, textarea, select").forEach((el) => {
          if (el.name) body[el.name] = el.value;
        });

        for (const attr of form.attributes) {
          if (attr.name.startsWith("data-")) {
            const key = attr.name.replace(/^data-/, "");
            if (key !== "form-handler") body[key] = attr.value;
          }
        }

        console.log("[form-handler] Submitting form with payload:", body);

        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        let resultText = await response.text();
        let parsed;
        try {
          parsed = JSON.parse(resultText);
        } catch (error) {
          /* ignore non-JSON */
        }

        if (!response.ok) {
          const msg =
            parsed?.error || parsed?.message || resultText || response.statusText;
          throw new Error(msg);
        }

        alert(successMessage);
        if (body.redirect) {
          window.location.href = body.redirect;
        } else {
          form.reset();
        }
      } catch (error) {
        alert(`${errorMessage} (${error.message})`);
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          if ("textContent" in submitBtn) submitBtn.textContent = defaultButtonLabel;
          if ("value" in submitBtn) submitBtn.value = defaultButtonLabel;
        }
      }
    });
  });
});
