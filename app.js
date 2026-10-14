const MAX_STUDENTS = 30;
const SUPABASE_URL = window.SUPABASE_URL || "";
const SUPABASE_KEY = window.SUPABASE_PUBLISHABLE_KEY || "";
const isConfigured = SUPABASE_URL.startsWith("https://") &&
  !SUPABASE_URL.includes("PASTE_YOUR") && SUPABASE_KEY && !SUPABASE_KEY.includes("PASTE_YOUR");

const setupWarning = document.getElementById("setupWarning");
const loginPanel = document.getElementById("loginPanel");
const appContent = document.getElementById("appContent");
const accountBar = document.getElementById("accountBar");
const signedInEmail = document.getElementById("signedInEmail");
const loginForm = document.getElementById("loginForm");
const loginMessage = document.getElementById("loginMessage");
const form = document.getElementById("studentForm");
const nameInput = document.getElementById("studentName");
const markInput = document.getElementById("studentMark");
const message = document.getElementById("formMessage");
const resultsBody = document.getElementById("resultsBody");
const emptyState = document.getElementById("emptyState");
const searchInput = document.getElementById("searchInput");
let supabaseClient = null;
let students = [];
let busy = false;

function getGrade(mark) {
  if (mark >= 80) return "A";
  if (mark >= 75) return "B+";
  if (mark >= 70) return "B";
  if (mark >= 65) return "C+";
  if (mark >= 60) return "C";
  if (mark >= 55) return "D+";
  if (mark >= 50) return "D";
  return "F";
}

function showMessage(text, isError = false, target = message) {
  target.textContent = text;
  target.classList.toggle("error", isError);
}

function setBusy(value) {
  busy = value;
  document.getElementById("addStudentBtn").disabled = value;
  document.getElementById("loginBtn").disabled = value;
}

function showSignedOut() {
  loginPanel.hidden = false;
  appContent.hidden = true;
  accountBar.hidden = true;
}

function showSignedIn(user) {
  loginPanel.hidden = true;
  appContent.hidden = false;
  accountBar.hidden = false;
  signedInEmail.textContent = user.email || "Signed in";
}

async function loadStudents() {
  showMessage("Loading student records…");
  const { data, error } = await supabaseClient
    .from("students")
    .select("id, name, mark, created_at")
    .order("created_at", { ascending: true });
  if (error) {
    showMessage(`Could not load records: ${error.message}`, true);
    return;
  }
  students = data || [];
  render();
  showMessage("Student records loaded from the shared database.");
}

function render() {
  const query = searchInput.value.trim().toLowerCase();
  const visibleStudents = students.filter(student => student.name.toLowerCase().includes(query));
  resultsBody.replaceChildren();

  visibleStudents.forEach((student, visibleIndex) => {
    const row = document.createElement("tr");
    const numberCell = document.createElement("td");
    numberCell.textContent = String(students.findIndex(item => item.id === student.id) + 1);
    const nameCell = document.createElement("td");
    nameCell.textContent = student.name;
    const markCell = document.createElement("td");
    markCell.textContent = String(student.mark);
    const gradeCell = document.createElement("td");
    const badge = document.createElement("span");
    badge.className = "grade";
    badge.textContent = getGrade(student.mark);
    gradeCell.appendChild(badge);
    const resultCell = document.createElement("td");
    resultCell.textContent = student.mark >= 50 ? "Pass" : "Fail";
    resultCell.className = student.mark >= 50 ? "status-pass" : "status-fail";
    const actionCell = document.createElement("td");
    const deleteButton = document.createElement("button");
    deleteButton.className = "delete-btn";
    deleteButton.type = "button";
    deleteButton.textContent = "Delete";
    deleteButton.setAttribute("aria-label", `Delete ${student.name}`);
    deleteButton.addEventListener("click", () => deleteStudent(student));
    actionCell.appendChild(deleteButton);
    row.append(numberCell, nameCell, markCell, gradeCell, resultCell, actionCell);
    resultsBody.appendChild(row);
  });

  emptyState.hidden = visibleStudents.length !== 0;
  document.getElementById("totalStudents").textContent = String(students.length);
  if (students.length) {
    const total = students.reduce((sum, student) => sum + student.mark, 0);
    const highest = Math.max(...students.map(student => student.mark));
    const passes = students.filter(student => student.mark >= 50).length;
    document.getElementById("classAverage").textContent = `${(total / students.length).toFixed(1)}%`;
    document.getElementById("highestMark").textContent = `${highest}%`;
    document.getElementById("passRate").textContent = `${Math.round((passes / students.length) * 100)}%`;
  } else {
    document.getElementById("classAverage").textContent = "—";
    document.getElementById("highestMark").textContent = "—";
    document.getElementById("passRate").textContent = "—";
  }
  document.getElementById("recordCount").textContent = `Showing ${visibleStudents.length} of ${students.length} student${students.length === 1 ? "" : "s"}`;
}

loginForm.addEventListener("submit", async event => {
  event.preventDefault();
  if (busy) return;
  setBusy(true);
  showMessage("Signing in…", false, loginMessage);
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;
  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
  setBusy(false);
  if (error) {
    showMessage(`Sign-in failed: ${error.message}`, true, loginMessage);
    return;
  }
  document.getElementById("loginPassword").value = "";
  showSignedIn(data.user);
  await loadStudents();
});

document.getElementById("signOutBtn").addEventListener("click", async () => {
  const { error } = await supabaseClient.auth.signOut();
  if (error) {
    showMessage(`Sign-out failed: ${error.message}`, true);
    return;
  }
  students = [];
  render();
  showSignedOut();
  showMessage("You have signed out.", false, loginMessage);
});

form.addEventListener("submit", async event => {
  event.preventDefault();
  if (busy) return;
  const name = nameInput.value.trim();
  const rawMark = markInput.value.trim();
  const mark = Number(rawMark);
  if (!name) return showMessage("Please enter a student name.", true);
  if (rawMark === "" || !Number.isInteger(mark) || mark < 0 || mark > 100) return showMessage("Enter a whole-number mark between 0 and 100.", true);
  if (students.length >= MAX_STUDENTS) return showMessage("The class limit of 30 students has been reached. Delete a record to add another.", true);

  setBusy(true);
  showMessage("Saving student record…");
  const { data, error } = await supabaseClient
    .from("students")
    .insert({ name, mark })
    .select("id, name, mark, created_at")
    .single();
  setBusy(false);
  if (error) return showMessage(`Could not save record: ${error.message}`, true);
  students.push(data);
  students.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  form.reset();
  render();
  showMessage(`${name} was saved to the shared database.`);
  nameInput.focus();
});

async function deleteStudent(student) {
  if (!window.confirm(`Delete the record for ${student.name}? This removes it from the shared database.`)) return;
  const { error } = await supabaseClient.from("students").delete().eq("id", student.id);
  if (error) return showMessage(`Could not delete record: ${error.message}`, true);
  students = students.filter(item => item.id !== student.id);
  render();
  showMessage(`${student.name}'s record was deleted from the database.`);
}

searchInput.addEventListener("input", render);

document.getElementById("clearBtn").addEventListener("click", async () => {
  if (!students.length) return showMessage("There are no records to clear.", true);
  if (!window.confirm("Delete ALL student records from the shared database? This affects every device and cannot be undone.")) return;
  const { error } = await supabaseClient.from("students").delete().gt("id", 0);
  if (error) return showMessage(`Could not clear records: ${error.message}`, true);
  students = [];
  render();
  showMessage("All student records have been deleted from the shared database.");
});

document.getElementById("exportBtn").addEventListener("click", () => {
  if (!students.length) return showMessage("Add at least one student before exporting.", true);
  const rows = [["No.", "Student Name", "Mark", "Grade", "Result"]];
  students.forEach((student, index) => rows.push([index + 1, student.name, student.mark, getGrade(student.mark), student.mark >= 50 ? "Pass" : "Fail"]));
  const csv = rows.map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\r\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "student-examination-results.csv";
  link.click();
  URL.revokeObjectURL(url);
  showMessage("Results exported as a CSV file.");
});

async function initialize() {
  if (!isConfigured || !window.supabase?.createClient) {
    setupWarning.hidden = false;
    loginPanel.hidden = true;
    appContent.hidden = true;
    return;
  }
  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  const { data, error } = await supabaseClient.auth.getSession();
  if (error) {
    showSignedOut();
    showMessage(`Could not check sign-in status: ${error.message}`, true, loginMessage);
    return;
  }
  if (data.session?.user) {
    showSignedIn(data.session.user);
    await loadStudents();
  } else {
    showSignedOut();
  }
  supabaseClient.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_OUT" || !session?.user) {
      students = [];
      render();
      showSignedOut();
    }
  });
}

initialize();
