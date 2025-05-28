document.getElementById("input").addEventListener("input", function () {
    this.style.height = "80px"; // Default height
    this.style.height = Math.min(this.scrollHeight, 120) + "px"; // Expands but stays contained
});
