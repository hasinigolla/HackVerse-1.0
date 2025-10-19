// Get logged-in user email from localStorage (set after login)
const loggedInUserEmail = localStorage.getItem("userEmail"); 

if (!loggedInUserEmail) {
    alert("Please login first");
    window.location.href = "index.html";
}

fetch(`/api/donors?email=${loggedInUserEmail}`)
  .then(res => res.json())
  .then(data => {
    const receiveContainer = document.getElementById("receiveContainer");
    const donateContainer = document.getElementById("donateContainer");

    // From Whom I Can Receive
    data.fromWhomICanReceive.forEach(user => {
      receiveContainer.innerHTML += `
        <div class="card">
          <h3>${user.first_name} ${user.last_name}</h3>
          <p><strong>Blood Type:</strong> ${user.blood_type}</p>
          <p><strong>Email:</strong> ${user.email}</p>
          <p><strong>Phone:</strong> ${user.phone}</p>
          <p><strong>Address:</strong> ${user.address}</p>
        </div>
      `;
    });

    // To Whom I Can Donate
    data.toWhomICanDonate.forEach(user => {
      donateContainer.innerHTML += `
        <div class="card">
          <h3>${user.first_name} ${user.last_name}</h3>
          <p><strong>Blood Type:</strong> ${user.blood_type}</p>
          <p><strong>Email:</strong> ${user.email}</p>
          <p><strong>Phone:</strong> ${user.phone}</p>
          <p><strong>Address:</strong> ${user.address}</p>
        </div>
      `;
    });
  })
  .catch(err => {
    console.error("Error fetching donors:", err);
    alert("Failed to load donors");
  });
