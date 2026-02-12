const form = document.getElementById('client-form');
const statusText = document.getElementById('status');
const clientList = document.getElementById('client-list');

async function loadClients() {
  const response = await fetch('/api/clients');
  const data = await response.json();

  clientList.innerHTML = '';
  data.clients.forEach((client) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${client.name}</td>
      <td>${client.email}</td>
      <td>${client.phone || '-'}</td>
      <td>${client.notes || '-'}</td>
      <td>${new Date(client.created_at).toLocaleString()}</td>
    `;
    clientList.appendChild(row);
  });
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(form);
  const payload = Object.fromEntries(formData.entries());

  const response = await fetch('/api/clients', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const data = await response.json();

  if (!response.ok) {
    statusText.textContent = data.error || 'Something went wrong.';
    statusText.style.color = '#b91c1c';
    return;
  }

  statusText.textContent = data.message;
  statusText.style.color = '#166534';
  form.reset();
  await loadClients();
});

loadClients();
