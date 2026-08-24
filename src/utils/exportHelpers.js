export const getFilterDates = (
  filterTahun,
  filterBulan,
  filterMinggu,
  liburArray = [],
  hariKerja = "1,2,3,4,5,6",
) => {
  let dates = [];
  const y = parseInt(filterTahun);
  const m = parseInt(filterBulan) - 1;
  const daysInMonth = new Date(y, m + 1, 0).getDate();

  let start = 1;
  let end = daysInMonth;

  if (filterMinggu !== "all") {
    const w = parseInt(filterMinggu);
    start = (w - 1) * 7 + 1;
    end = w * 7;
    if (end > daysInMonth) end = daysInMonth;
  }

  // Ubah string hariKerja ("1,2,3,4,5") menjadi array integer [1,2,3,4,5]
  const activeDaysArray = hariKerja.toString().split(",").map(Number);

  for (let day = start; day <= end; day++) {
    const date = new Date(y, m, day);
    const dd = String(day).padStart(2, "0");
    const mm = String(m + 1).padStart(2, "0");
    const dateStr = `${dd}/${mm}/${y}`;

    // Dapatkan index hari (0=Minggu, 1=Senin, dll)
    const dayOfWeek = date.getDay();

    // Cek apakah dayOfWeek ADA di dalam array hari kerja kita
    const isOffDay = !activeDaysArray.includes(dayOfWeek);

    // Jika BUKAN hari libur mingguan (isOffDay) DAN BUKAN tanggal merah (liburArray)
    if (!isOffDay && !liburArray.includes(dateStr)) {
      dates.push(dateStr);
    }
  }
  return dates;
};

export const parseTimeStr = (ts) => {
  if (!ts || ts === "--:--") return 0;
  const [h, m] = ts.split(":");
  return parseInt(h) * 60 + parseInt(m);
};

export const parseIndoDate = (dateStr) => {
  const [d, m, y] = dateStr.split("/");
  const dateObj = new Date(y, parseInt(m) - 1, d);
  const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const months = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];
  return {
    dayName: days[dateObj.getDay()],
    fullDate: `${d} ${months[parseInt(m) - 1]} ${y}`,
  };
};
