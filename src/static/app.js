document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const activityTemplate = document.getElementById("activity-template");

  // Helper to create initials from email
  function getInitials(email) {
    const local = (email || "").split("@")[0];
    const parts = local.split(/[\._\-]+/).filter(Boolean);
    if (parts.length === 0) return (local || "").slice(0, 2).toUpperCase();
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
  // Force a network fetch so we don't get a cached activities payload
  const response = await fetch("/activities", { cache: "no-store" });
      const activities = await response.json();

      // Remove existing activity cards but keep the template element
      activitiesList.querySelectorAll(".activity-card").forEach((n) => n.remove());
      const loadingEl = activitiesList.querySelector(".loading");
      if (loadingEl) loadingEl.remove();

      // Reset activity select (keep the default placeholder)
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        // Clone the template and populate fields
        const clone = activityTemplate.content.cloneNode(true);
        clone.querySelector(".activity-name").textContent = name;
        clone.querySelector(".activity-description").textContent = details.description;
        clone.querySelector(".activity-schedule").innerHTML = `<strong>Schedule:</strong> ${details.schedule}`;
        clone.querySelector(".activity-capacity").innerHTML = `<strong>Max participants:</strong> ${details.max_participants}`;

        const spotsLeft = details.max_participants - (details.participants?.length || 0);
        const availabilityP = document.createElement("p");
        availabilityP.innerHTML = `<strong>Availability:</strong> ${spotsLeft} ${spotsLeft === 1 ? "spot" : "spots"} left`;

        // Insert availability before participants section
        const participantsSection = clone.querySelector(".participants-section");
        participantsSection.parentNode.insertBefore(availabilityP, participantsSection);

        // Populate participants list
        const list = clone.querySelector(".participants-list");
        list.innerHTML = "";
        if (details.participants && details.participants.length > 0) {
          details.participants.forEach((email) => {
            const li = document.createElement("li");
            li.className = "participant-item";

            const pill = document.createElement("span");
            pill.className = "participant-pill";
            pill.textContent = getInitials(email);
            li.appendChild(pill);

            li.appendChild(document.createTextNode(" " + email));

            // Delete / remove button
            const deleteBtn = document.createElement("button");
            deleteBtn.type = "button";
            deleteBtn.className = "participant-delete";
            deleteBtn.title = "Remove participant";
            deleteBtn.textContent = "Delete";

            // When clicked, call the unregister API and refresh the activities on success
            deleteBtn.addEventListener("click", async () => {
              try {
                const res = await fetch(
                  `/activities/${encodeURIComponent(name)}/unregister?email=${encodeURIComponent(email)}`,
                  { method: "POST", cache: "no-store" }
                );

                if (res.ok) {
                  // refresh so availability & list update
                  fetchActivities();
                } else {
                  const err = await res.json().catch(() => ({}));
                  messageDiv.textContent = err.detail || "Failed to remove participant";
                  messageDiv.className = "message error";
                  messageDiv.classList.remove("hidden");
                  setTimeout(() => {
                    messageDiv.classList.add("hidden");
                  }, 5000);
                }
              } catch (error) {
                console.error("Error unregistering participant:", error);
              }
            });

            li.appendChild(deleteBtn);
            list.appendChild(li);
          });
        } else {
          const li = document.createElement("li");
          li.className = "no-participants";
          li.textContent = "No participants yet.";
          list.appendChild(li);
        }

        activitiesList.appendChild(clone);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
          cache: "no-store",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "message success";
        signupForm.reset();
        // Refresh activities so participants and availability update.
        // Await to ensure the UI reflects the change immediately.
        await fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "message error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "message error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
