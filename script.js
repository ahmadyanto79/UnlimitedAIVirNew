const renderer = new marked.Renderer();
renderer.code = function(code, language) {
    const validLang = language || 'text';
    const escapedCode = code.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return `
        <div class="code-container">
            <div class="code-header">
                <span>${validLang}</span>
                <button class="copy-btn" onclick="copyCode(this, \`${encodeURIComponent(code)}\`)"> Copy Code</button>
            </div>
            <pre><code class="hljs ${validLang}">${escapedCode}</code></pre>
        </div>
    `;
};
marked.setOptions({ renderer: renderer });

function copyCode(button, encodedCode) {
    const code = decodeURIComponent(encodedCode);
    navigator.clipboard.writeText(code).then(() => {
        const originalText = button.innerHTML;
        button.innerHTML = " Tersalin!";
        setTimeout(() => button.innerHTML = originalText, 2000);
    });
}

document.addEventListener("DOMContentLoaded", () => {
    const license = localStorage.getItem("ai_license");
    document.getElementById("license-modal").style.display = license ? "none" : "flex";
});

async function saveLicense() {
    const inputField = document.getElementById("license-input");
    const val = inputField.value.trim();
    const btn = inputField.nextElementSibling;

    if (val === "") return alert("Lisensi tidak boleh kosong!");

    btn.innerText = "Memeriksa...";
    btn.disabled = true;

    try {
        const response = await fetch('/api/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ license: val })
        });
        
        const data = await response.json();

        if (data.valid) {
            localStorage.setItem("ai_license", val);
            document.getElementById("license-modal").style.display = "none";
        } else {
            alert(" Lisensi tidak valid atau belum didaftarkan oleh Admin!");
        }
    } catch (error) {
        alert("Gagal menghubungi server. Coba lagi.");
    } finally {
        btn.innerText = "Masuk";
        btn.disabled = false;
    }
}

function logout() {
    localStorage.removeItem("ai_license");
    location.reload();
}

async function sendMessage() {
    const inputField = document.getElementById("user-input");
    const prompt = inputField.value.trim();
    const license = localStorage.getItem("ai_license");
    
    if (!prompt) return;
    if (!license) {
        alert("Sesi habis, harap login kembali.");
        logout(); return;
    }

    appendMessage("user-msg", prompt);
    inputField.value = "";
    const loadingId = appendMessage("ai-msg", "Mengetik...");

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt, license })
        });

        const data = await response.json();
        
        if (response.status === 401) {
            updateMessage(loadingId, " Akses ditolak: " + data.error);
            setTimeout(logout, 2000); return;
        }

        if (data.error) {
            updateMessage(loadingId, " " + data.error);
        } else {
            updateMessage(loadingId, marked.parse(data.reply));
            document.querySelectorAll('pre code').forEach((block) => hljs.highlightElement(block));
        }
    } catch (error) {
        updateMessage(loadingId, " Terjadi kesalahan jaringan server.");
    }
}

function appendMessage(type, text) {
    const chatBox = document.getElementById("chat-box");
    const id = "msg-" + Date.now();
    const msgDiv = document.createElement("div");
    msgDiv.className = `message ${type}`;
    msgDiv.innerHTML = `<div class="content" id="${id}">${text}</div>`;
    chatBox.appendChild(msgDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
    return id;
}

function updateMessage(id, newText) {
    const msgEl = document.getElementById(id);
    if (msgEl) {
        msgEl.innerHTML = newText;
        const chatBox = document.getElementById("chat-box");
        chatBox.scrollTop = chatBox.scrollHeight;
    }
}

document.getElementById("user-input").addEventListener("keydown", function(e) {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});
