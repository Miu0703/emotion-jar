//const API = 'http://localhost:3001/api';
const API = "https://emotion-jar-60yp.onrender.com";
const tokenKey = 'ej_token';

function authHeader () {
  return { Authorization: 'Bearer ' + localStorage.getItem(tokenKey) };
}

function app () {
  return {
    newMode: 'self',
    isOwner: false,
    isPartner: false,
    canAdd: false,
    canDel: false,
    drawnId: null,
    showShelf: false,
    shelf: [],
    //host: 'http://localhost:3001',
    host: "https://emotion-jar-60yp.onrender.com",

    jars: [], current: null,
    newJarName: '', partner: '', newPurpose:'',
    newPersona:'gentle_sister',
    msg: '', openAt: '', drawn: '',

    async init () {
      const tk = localStorage.getItem(tokenKey);
      if (!tk || tk === 'undefined')
        return location.href = 'login.html';
      this.user = JSON.parse(atob(tk.split('.')[1])).email;
      await this.loadJars();
      window.$jarApp = this;
    },

    async loadJars () {
      this.jars = await (await fetch(`${API}/jars`, { headers: authHeader() })).json();
    },
    async createJar () {
      if (!this.newJarName) return;
      await fetch(`${API}/jars`, {
        method: 'POST',
        headers: { ...authHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:this.newJarName,
          partner_email:this.partner,
          mode:this.newMode,
          personality:this.newPersona,
          purpose:this.newPurpose
        })
      });
      this.newJarName = this.partner = this.newPurpose = '';
      this.newMode = 'self';
      this.newPersona = 'gentle_sister';
      this.loadJars();
    },
    async generateAI() {
      if (!this.current) return;
      const r = await fetch(`${API}/jars/${this.current.id}/generate`, {
        method: 'POST', headers: authHeader()
      });
      const data = await r.json();
      if (data.message) {
        // 直接显示，同时刷新展示架
        this.drawn = `<p>${data.message} <span class="text-sm text-gray-400">(AI)</span></p>`;
        this.loadShelf();
      } else {
        alert('出错了，请稍后再试');
      }
    },
    selectJar (j) {
      this.current = j;
      this.drawn = '';
      this.isOwner   = j.owner === this.user;
      this.isPartner = j.partner_email === this.user;
      this.canAdd = (j.mode==='self' && this.isOwner)
                || (j.mode==='partner' && this.isOwner)
                || (j.mode==='shared');
      this.canDel = (j.mode==='self' && this.isOwner)
                || (j.mode==='partner' && this.isPartner)
                || (j.mode==='shared');
      this.loadShelf();
    },

    async addMsg () {
      if (!this.current) return;
      const fd = new FormData();
      fd.append('jarId', this.current.id);
      fd.append('content', this.msg);
      fd.append('openAt', this.openAt);
      const file = document.getElementById('fileInput').files[0];
      if (file) fd.append('file', file);
      await fetch(`${API}/messages`, {
        method: 'POST',
        headers: authHeader(),
        body: fd
      });
      this.msg = this.openAt = '';
      alert('已存入！');
      document.getElementById('fileInput').value = '';
    },

    async drawMsg () {
      const r = await fetch(`${API}/messages/random?jarId=${this.current.id}`, { headers: authHeader() });
      const data = await r.json();
      if (!data || !data.content) { this.drawn = '暂无可开启的信息'; return; }
      this.drawnId = data.id;
      let html = `<p>${data.content}</p>`;
      if (data.image_url) html += `<img src="${this.host+data.image_url}" class="rounded mb-2 max-h-48 object-contain" />`;
      if (data.voice_url) {
        const aid = 'a'+data.id;
        html += `<audio id="${aid}" src="${this.host+data.voice_url}" controls class="w-full mb-2"></audio>`+
                `<button class="btn-secondary" onclick="document.getElementById('${aid}').play()">▶ 播放</button>`;
      }
      html += `<button class="btn-secondary" onclick="window.$jarApp.favoriteMsg(${data.id})">⭐ 收藏</button>`;
      this.drawn = html;
    },

    // 展示架相关
    async loadShelf() {
      const r = await fetch(`${API}/messages/shelf?jarId=${this.current.id}`, {headers: authHeader()});
      this.shelf = await r.json();
    },
    putBack(id) {
      fetch(`${API}/messages/${id}/putback`, {method:'POST',headers:authHeader()}).then(()=>this.loadShelf());
    },
    async deleteMsg(id) {
      await fetch(`${API}/messages/${id}`, { method:'DELETE', headers:authHeader() });
      this.loadShelf();
      this.drawn = '';
    },   
    async favoriteMsg(id) {
      const resp = await fetch(`${API}/messages/${id}/favorite`, {
        method: 'POST',
        headers: authHeader()
      });
      // 收藏后刷新展示架列表
      if (resp.ok) await this.loadShelf();
    },
    
    moveUp(idx) {
      if (idx === 0) return;
      [this.shelf[idx-1], this.shelf[idx]] = [this.shelf[idx], this.shelf[idx-1]];
    },
    moveDown(idx) {
      if (idx === this.shelf.length-1) return;
      [this.shelf[idx], this.shelf[idx+1]] = [this.shelf[idx+1], this.shelf[idx]];
    },

    logout () {
      localStorage.removeItem(tokenKey);
      location.href = 'login.html';
    }
  };
}
