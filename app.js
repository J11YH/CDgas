const state = { data: null, view: 'dashboard', selected: null, tab: 'inspect' };
const content = document.querySelector('#app-content');
const pageTitle = document.querySelector('#page-title');
const sourceName = document.querySelector('#source-name');
const modal = document.querySelector('#modal-backdrop');
const modalContent = document.querySelector('#modal-content');
const fmt = new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 0 });
const money = new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY', maximumFractionDigits: 0 });

function tag(priority) {
  const color = priority === '紧急' ? 'red' : priority === '高' ? 'orange' : priority === '低' ? 'green' : 'gray';
  return `<span class="tag ${color}">${priority}</span>`;
}

function toast(message, error = false) {
  const element = document.querySelector('#toast');
  element.textContent = message;
  element.className = `toast show${error ? ' error' : ''}`;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => element.className = 'toast', 2800);
}

async function loadData() {
  try {
    const response = await fetch('./data.json');
    if (!response.ok) throw new Error('静态数据读取失败');
    const data = await response.json();
    state.data = data;
    sourceName.textContent = `${data.source.file_name} · ${fmt.format(data.source.row_count)}行 · 静态演示版`;
    render();
  } catch (error) {
    content.innerHTML = `<div class="loading-state"><h2>数据加载失败</h2><p>${error.message}</p><p>请通过 GitHub Pages 或本地 HTTP 服务访问，不要直接双击 index.html。</p></div>`;
  }
}

async function login(username, password) {
  const demoUsers = { admin: 'gas-ai-2026', inspector: 'gas-ai-2026' };
  if (demoUsers[username] !== password) throw new Error('账号或密码错误');
  const data = { ok: true, username, display_name: username === 'admin' ? '稽查管理员' : '现场稽查员' };
  sessionStorage.setItem('gas-ai-user', JSON.stringify(data));
  document.querySelector('#login-screen').style.display = 'none';
  document.querySelector('.app-shell').classList.add('ready');
  loadData();
}

function workflow(active = 0) {
  const steps = [['01 查谁', 'AI风险筛查'], ['02 追多少', '异常气量核算'], ['03 怎么追', '一户一策']];
  return `<div class="workflow">${steps.map((step, index) => `<div class="workflow-step ${index === active ? 'active' : ''}"><b>${step[0]}</b><span>${step[1]}</span></div>`).join('')}</div>`;
}

function riskTable(users, mode = 'risk') {
  const headers = mode === 'loss'
    ? ['用户', '异常起始', '预测气量', '实际气量', '疑似损失', '核定区间', '操作']
    : mode === 'recovery'
      ? ['用户', '追缴金额', '用户分类', '历史缴费', '欠费金额', 'AI建议', '操作']
      : ['用户', '风险', '优先级', '主要异常', '所属区域', '操作'];
  return `<div class="table-wrap"><table><thead><tr>${headers.map(item => `<th>${item}</th>`).join('')}</tr></thead><tbody>${users.map(user => {
    if (mode === 'loss') return `<tr><td><b>${user.user_name}</b><br><small>${user.user_type}</small></td><td>${user.abnormal_start}</td><td>${fmt.format(user.predicted_gas)} m³</td><td>${fmt.format(user.actual_gas)} m³</td><td><b>${fmt.format(user.suspected_loss_gas)} m³</b></td><td>${fmt.format(user.loss_low)}–${fmt.format(user.loss_high)} m³</td><td><button class="link-button case-link" data-id="${user.user_id}" data-tab="calculate">核定气量</button></td></tr>`;
    if (mode === 'recovery') return `<tr><td><b>${user.user_name}</b><br><small>${user.user_type}</small></td><td><b>${money.format(user.recovery_amount)}</b></td><td><span class="tag ${user.recovery_type === '重点追缴型' ? 'red' : user.recovery_type === '协商追缴型' ? 'orange' : 'green'}">${user.recovery_type}</span></td><td>${user.payment_score}分</td><td>${money.format(user.arrears_yuan || 0)}</td><td class="reason-cell">${user.recovery_advice}</td><td><button class="link-button case-link" data-id="${user.user_id}" data-tab="recover">生成方案</button></td></tr>`;
    return `<tr><td><b>${user.user_name}</b><br><small>${user.user_type} · ${user.user_id}</small></td><td><span class="risk-score ${user.risk_score >= 70 ? 'high' : 'medium'}">${user.risk_score}</span>分</td><td>${tag(user.priority)}</td><td class="reason-cell">${user.reason}</td><td>${user.region}</td><td><button class="link-button case-link" data-id="${user.user_id}" data-tab="inspect">查看案件</button></td></tr>`;
  }).join('')}</tbody></table></div>`;
}

function dashboard() {
  const users = state.data.users;
  const high = users.filter(user => user.risk_score >= 70).length;
  const pendingLoss = users.filter(user => user.suspected_loss_gas > 1000).length;
  const recoveryAmount = users.reduce((sum, user) => sum + user.recovery_amount, 0);
  return `${workflow(0)}
    <div class="kpi-grid">
      <div class="kpi"><div class="kpi-top"><span>高风险用户</span><span class="tag red">需关注</span></div><strong class="accent">${high}</strong><small>风险评分 ≥ 70分</small></div>
      <div class="kpi"><div class="kpi-top"><span>待现场稽查</span><span>本期</span></div><strong>${high}</strong><small>按优先级排序</small></div>
      <div class="kpi"><div class="kpi-top"><span>待核定案件</span><span>AI初算</span></div><strong>${pendingLoss}</strong><small>疑似损失气量超过1,000m³</small></div>
      <div class="kpi"><div class="kpi-top"><span>疑似追缴金额</span><span class="tag orange">预估</span></div><strong>${money.format(recoveryAmount)}</strong><small>需结合现场证据确认</small></div>
    </div>
    <div class="grid-main">
      <section class="panel"><div class="panel-head"><div><h2>AI 风险用户排行</h2><p>神经网络预测偏差、异常频率与缴费行为综合评分</p></div><span class="model-badge">${state.data.model.name}</span></div>${riskTable(users.slice(0, 8))}</section>
      <section class="panel"><div class="panel-head"><div><h2>模型运行状态</h2><p>本次导入后即时训练</p></div></div><div class="model-card">
        <div class="network"><div class="layer">${'<i class="node"></i>'.repeat(7)}</div><span class="arrow">→</span><div class="layer">${'<i class="node"></i>'.repeat(6)}</div><span class="arrow">→</span><div class="layer">${'<i class="node"></i>'.repeat(4)}</div><span class="arrow">→</span><div class="layer"><i class="node"></i></div></div>
        <div class="metric"><span>网络结构</span><b>${state.data.model.architecture}</b></div><div class="metric"><span>训练样本</span><b>${fmt.format(state.data.model.training_rows)} 行</b></div><div class="metric"><span>训练轮次</span><b>${state.data.model.epochs}</b></div><div class="metric"><span>训练集 MAE</span><b>${state.data.model.mae} m³/日</b></div><div class="metric"><span>训练时间</span><b>${state.data.model.trained_at.slice(11)}</b></div>
      </div></section>
    </div>`;
}

function listView(mode) {
  const config = mode === 'loss'
    ? { title: 'AI 气量核算', active: 1, subtitle: '根据正常预测气量与实际计量气量测算疑似损失' }
    : mode === 'recovery'
      ? { title: 'AI 追缴方案', active: 2, subtitle: '按金额、缴费与沟通情况生成一户一策' }
      : { title: '案件跟踪', active: 2, subtitle: '跟踪查、算、追全过程状态' };
  pageTitle.textContent = config.title;
  if (mode === 'cases') {
    return `${workflow(2)}<section class="panel wide-panel"><div class="panel-head"><div><h2>案件处理台账</h2><p>${config.subtitle}</p></div><span class="model-badge">${state.data.source.user_count} 户</span></div><div class="table-wrap"><table><thead><tr><th>案件编号</th><th>用户</th><th>当前阶段</th><th>负责人</th><th>追缴金额</th><th>进度</th><th>操作</th></tr></thead><tbody>${state.data.users.map((user, index) => `<tr><td>AJ-${String(index + 1).padStart(4, '0')}</td><td><b>${user.user_name}</b></td><td>${user.risk_score >= 70 ? '<span class="tag orange">待现场稽查</span>' : '<span class="tag gray">AI筛查完成</span>'}</td><td>${user.owner || '张明'}</td><td>${money.format(user.recovery_amount)}</td><td>${user.risk_score >= 70 ? '查谁 → 待核量' : '筛查完成'}</td><td><button class="link-button case-link" data-id="${user.user_id}" data-tab="inspect">查看</button></td></tr>`).join('')}</tbody></table></div></section>`;
  }
  return `${workflow(config.active)}<section class="panel wide-panel"><div class="panel-head"><div><h2>${config.title}工作清单</h2><p>${config.subtitle}</p></div><span class="model-badge">${state.data.users.length} 户</span></div><div class="filterbar"><input id="search-input" placeholder="搜索用户名称"><select id="risk-filter"><option value="all">全部风险等级</option><option value="70">高风险 ≥70</option></select></div><div id="list-table">${riskTable(state.data.users, mode)}</div></section>`;
}

function render() {
  if (!state.data) return;
  document.querySelectorAll('.nav-item').forEach(item => item.classList.toggle('active', item.dataset.view === state.view));
  if (state.view === 'dashboard') { pageTitle.textContent = 'AI 智能稽查'; content.innerHTML = dashboard(); }
  else content.innerHTML = listView(state.view);
  bindDynamic();
}

function lineChart(series) {
  const width = 720, height = 260, pad = { x: 42, y: 24 }, chartW = width - 64, chartH = height - 54;
  const all = series.flatMap(point => [point.actual, point.predicted]);
  const min = Math.min(...all) * .88, max = Math.max(...all) * 1.08;
  const point = (value, index) => `${pad.x + index * chartW / Math.max(1, series.length - 1)},${pad.y + (max - value) * chartH / Math.max(1, max - min)}`;
  const actual = series.map((item, index) => point(item.actual, index)).join(' ');
  const predicted = series.map((item, index) => point(item.predicted, index)).join(' ');
  const grids = [0, .25, .5, .75, 1].map(ratio => { const y = pad.y + ratio * chartH; const val = max - ratio * (max - min); return `<line class="grid" x1="${pad.x}" y1="${y}" x2="${pad.x + chartW}" y2="${y}"/><text x="2" y="${y + 3}">${fmt.format(val)}</text>`; }).join('');
  return `<svg class="chart" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">${grids}<polyline class="predicted" points="${predicted}"/><polyline class="actual" points="${actual}"/></svg><div class="legend"><span><i style="background:var(--orange)"></i>实际计量</span><span><i style="background:var(--teal)"></i>AI正常预测</span></div>`;
}

function openCase(userId, tab = 'inspect') {
  state.selected = state.data.users.find(user => user.user_id === userId);
  state.tab = tab;
  document.querySelector('#modal-title').textContent = state.selected.user_name;
  modal.hidden = false;
  document.body.style.overflow = 'hidden';
  renderCase();
}

function renderCase() {
  const user = state.selected;
  const tabs = [['inspect', '01 查谁'], ['calculate', '02 追多少'], ['recover', '03 怎么追']];
  let body = '';
  if (state.tab === 'inspect') {
    body = `<div class="case-grid"><section class="inner-panel"><h3>近90日实际与预测用气曲线</h3><div class="inner-content"><div class="ai-callout"><b>AI异常解释：</b>${user.reason}。建议按“${user.priority}”优先级安排现场稽查。</div>${lineChart(user.series)}</div></section><aside class="inner-panel"><h3>风险判断</h3><div class="inner-content result-stack"><div class="result-item emphasis"><span>偷盗气风险</span><strong>${user.risk_score} 分</strong></div><div class="result-item"><span>预测偏差率</span><strong>${(user.deviation_rate * 100).toFixed(1)}%</strong></div><div class="result-item"><span>异常日占比</span><strong>${(user.anomaly_rate * 100).toFixed(1)}%</strong></div><div class="result-item"><span>稽查优先级</span><strong>${user.priority}</strong></div></div></aside></div><div class="case-actions"><button class="button secondary export-clue" data-id="${user.user_id}">导出稽查线索</button><button class="button primary next-tab" data-tab="calculate">确认异常，进入核量</button></div>`;
  } else if (state.tab === 'calculate') {
    body = `<div class="case-grid"><section class="inner-panel"><h3>异常气量测算依据</h3><div class="inner-content">${lineChart(user.series)}<div class="ai-callout"><b>测算说明：</b>模型判断异常可能始于 ${user.abnormal_start}。以神经网络正常预测为基线，并结合温度、星期周期、用户类型和合同容量测算。</div></div></section><aside class="inner-panel"><h3>AI核量结果</h3><div class="inner-content result-stack"><div class="result-item"><span>异常起始时间</span><strong>${user.abnormal_start}</strong></div><div class="result-item"><span>正常预测气量</span><strong>${fmt.format(user.predicted_gas)} m³</strong></div><div class="result-item"><span>实际计量气量</span><strong>${fmt.format(user.actual_gas)} m³</strong></div><div class="result-item emphasis"><span>疑似损失气量</span><strong>${fmt.format(user.suspected_loss_gas)} m³</strong></div><div class="result-item"><span>建议核定区间</span><strong>${fmt.format(user.loss_low)}–${fmt.format(user.loss_high)} m³</strong></div></div></aside></div><div class="case-actions"><button class="button secondary">调整核定参数</button><button class="button primary next-tab" data-tab="recover">确认气量，生成追缴方案</button></div>`;
  } else {
    const steps = [['首次处理', '2个工作日内电话或上门沟通'], ['协商阶段', '按制度确认一次性或分期方案'], ['履约跟踪', '记录到账并跟踪分期履约'], ['升级条件', '沟通失败或违约时转重点跟进']];
    body = `<div class="recovery-type"><span>AI一户一策建议</span><strong>${user.recovery_type}</strong><p>${user.recovery_advice}</p></div><div class="case-grid"><section class="inner-panel"><h3>建议执行路径</h3><div class="inner-content"><div class="steps">${steps.map((step, index) => `<div class="step-card"><b>0${index + 1} ${step[0]}</b><p>${step[1]}</p></div>`).join('')}</div><div class="ai-callout" style="margin-top:14px"><b>建议依据：</b>历史缴费评分 ${user.payment_score} 分，当前欠费 ${money.format(user.arrears_yuan || 0)}，疑似追缴金额 ${money.format(user.recovery_amount)}。最终方案需由业务人员按企业制度确认。</div></div></section><aside class="inner-panel"><h3>追缴结论</h3><div class="inner-content result-stack"><div class="result-item emphasis"><span>追缴金额</span><strong>${money.format(user.recovery_amount)}</strong></div><div class="result-item"><span>用户分类</span><strong>${user.recovery_type}</strong></div><div class="result-item"><span>沟通状态</span><strong>${user.communication_status || '未联系'}</strong></div><div class="result-item"><span>案件状态</span><strong>${user.case_status || '待处理'}</strong></div></div></aside></div><div class="case-actions"><button class="button secondary">调整方案</button><button class="button primary accept-plan">采纳AI方案</button></div>`;
  }
  modalContent.innerHTML = `<div class="case-hero"><div class="case-meta"><span>${user.user_id}</span><span>${user.user_type}</span><span>${user.region}</span><span>合同容量 ${fmt.format(user.contract_capacity_m3)}m³/日</span></div><div class="case-score"><strong>${user.risk_score}</strong><span>风险分<br>${tag(user.priority)}</span></div></div><div class="tabs">${tabs.map(tab => `<button class="tab ${state.tab === tab[0] ? 'active' : ''}" data-tab="${tab[0]}">${tab[1]}</button>`).join('')}</div><div class="case-body">${body}</div>`;
  modalContent.querySelectorAll('.tab, .next-tab').forEach(button => button.addEventListener('click', () => { state.tab = button.dataset.tab; renderCase(); }));
  modalContent.querySelector('.export-clue')?.addEventListener('click', () => exportClueCsv(user));
  modalContent.querySelector('.accept-plan')?.addEventListener('click', () => toast('已采纳AI追缴方案，案件进入执行跟踪'));
}

function exportClueCsv(user) {
  const rows = [
    ['项目','内容'], ['用户编号',user.user_id], ['用户名称',user.user_name], ['用户类型',user.user_type], ['所属区域',user.region],
    ['风险评分',user.risk_score], ['稽查优先级',user.priority], ['异常开始日期',user.abnormal_start],
    ['疑似损失气量(m³)',user.suspected_loss_gas], ['建议核定下限(m³)',user.loss_low], ['建议核定上限(m³)',user.loss_high],
    ['追缴预估金额(元)',user.recovery_amount], ['AI异常原因',user.reason], ['追缴建议',user.recovery_advice]
  ];
  const csv = '\ufeff' + rows.map(row => row.map(v => `"${String(v ?? '').replace(/"/g,'""')}"`).join(',')).join('\r\n');
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${user.user_id}_AI稽查线索.csv`; a.click(); URL.revokeObjectURL(a.href);
  toast('稽查线索已导出为 CSV');
}

function bindDynamic() {
  document.querySelectorAll('.case-link').forEach(button => button.addEventListener('click', () => openCase(button.dataset.id, button.dataset.tab)));
  const search = document.querySelector('#search-input');
  search?.addEventListener('input', () => {
    const filtered = state.data.users.filter(user => user.user_name.includes(search.value.trim()));
    document.querySelector('#list-table').innerHTML = riskTable(filtered, state.view);
    bindDynamic();
  });
}

document.querySelectorAll('.nav-item').forEach(button => button.addEventListener('click', () => { state.view = button.dataset.view; render(); }));
document.querySelector('#close-modal').addEventListener('click', () => { modal.hidden = true; document.body.style.overflow = ''; });
modal.addEventListener('click', event => { if (event.target === modal) document.querySelector('#close-modal').click(); });
document.querySelector('#import-button').addEventListener('click', () => document.querySelector('#file-input').click());
document.querySelector('#file-input').addEventListener('change', event => {
  const file = event.target.files[0]; if (!file) return;
  toast('静态演示版不运行 Python 模型；已保留当前演示数据。', true);
  event.target.value = '';
});

const savedUser = sessionStorage.getItem('gas-ai-user');
if (savedUser) {
  document.querySelector('#login-screen').style.display = 'none';
  document.querySelector('.app-shell').classList.add('ready');
  loadData();
}
document.querySelector('#login-form').addEventListener('submit', async event => {
  event.preventDefault();
  const errorElement = document.querySelector('#login-error');
  errorElement.textContent = '';
  const submit = document.querySelector('.login-submit');
  submit.disabled = true;
  submit.textContent = '登录中…';
  try { await login(document.querySelector('#login-username').value, document.querySelector('#login-password').value); }
  catch (error) { errorElement.textContent = error.message; }
  finally { submit.disabled = false; submit.textContent = '登录工作台'; }
});
