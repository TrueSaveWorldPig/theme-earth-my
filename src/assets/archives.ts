interface Post {
  spec: {
    publishTime: string;
    title: string;
  };
}

interface ArchiveMonth {
  month: number;
  posts: Post[];
}

interface ArchiveYear {
  year: number;
  months: ArchiveMonth[];
}

document.addEventListener("DOMContentLoaded", () => {
  const archiveData = (window as any).archiveData as ArchiveYear[] || [];
  if (!archiveData.length) return;

  const allPosts: Post[] = [];
  const dateToPosts: Record<string, Post[]> = {};

  archiveData.forEach((year: ArchiveYear) => {
    year.months.forEach((month: ArchiveMonth) => {
      month.posts.forEach((post: Post) => {
        allPosts.push(post);
        const date = new Date(post.spec.publishTime);
        const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
        if (!dateToPosts[dateStr]) dateToPosts[dateStr] = [];
        dateToPosts[dateStr].push(post);
      });
    });
  });

  const postDates = Object.keys(dateToPosts);

  // 1. 计算统计数据
  const uniqueDates = new Set(postDates);
  const publishDaysElement = document.getElementById("publish-days-count");
  if (publishDaysElement) {
    publishDaysElement.innerText = uniqueDates.size.toString();
  }

  // 计算连续天数 (Streak)
  const sortedDates = Array.from(uniqueDates).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  let streak = 0;
  if (sortedDates.length > 0) {
    const today = new Date();
    const todayStr = formatDate(today);
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const yesterdayStr = formatDate(yesterday);

    const firstDateStr = sortedDates[0];
    if (firstDateStr === todayStr || firstDateStr === yesterdayStr) {
      streak = 1;
      for (let i = 1; i < sortedDates.length; i++) {
        const d1 = new Date(sortedDates[i - 1]);
        const d2 = new Date(sortedDates[i]);
        const diff = (d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24);
        if (diff === 1) streak++;
        else break;
      }
    }
  }
  const streakDaysElement = document.getElementById("streak-days-count");
  if (streakDaysElement) {
    streakDaysElement.innerText = streak.toString();
  }

  // 2. 渲染热力图 (按月)
  let currentDisplayDate = new Date();
  // 确保初始显示的月份有数据，如果没有数据则跳转到最近的有文章的月份
  if (sortedDates.length > 0) {
    const latestPostDate = new Date(sortedDates[0]);
    currentDisplayDate = new Date(latestPostDate.getFullYear(), latestPostDate.getMonth(), 1);
  }

  const render = () => {
    renderMonthHeatmap(currentDisplayDate, dateToPosts);
    updateHeatmapTitle(currentDisplayDate);
  };

  document.getElementById("prev-month")?.addEventListener("click", () => {
    currentDisplayDate.setMonth(currentDisplayDate.getMonth() - 1);
    render();
  });

  document.getElementById("next-month")?.addEventListener("click", () => {
    currentDisplayDate.setMonth(currentDisplayDate.getMonth() + 1);
    render();
  });

  render();
});

function formatDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function updateHeatmapTitle(date: Date) {
  const titleEl = document.getElementById("heatmap-title");
  if (titleEl) {
    const monthName = date.toLocaleString("default", { month: "long", year: "numeric" });
    titleEl.innerText = `${monthName} 发布强度`;
  }
}

function renderMonthHeatmap(displayDate: Date, dateToPosts: Record<string, Post[]>) {
  const container = document.getElementById("archive-heatmap");
  if (!container) return;

  container.innerHTML = "";
  
  const year = displayDate.getFullYear();
  const month = displayDate.getMonth();
  
  // 获取该月第一天和最后一天
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  
  // 获取日历网格数据 (包含前后补齐)
  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - startDate.getDay()); // 补齐到周日
  
  const endDate = new Date(lastDay);
  endDate.setDate(endDate.getDate() + (6 - endDate.getDay())); // 补齐到周六

  const gridContainer = document.createElement("div");
  gridContainer.className = "grid grid-cols-7 gap-2 p-2 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700";
  
  // 星期标签
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  weekDays.forEach(day => {
    const dayLabel = document.createElement("div");
    dayLabel.className = "text-[10px] text-slate-400 font-medium text-center uppercase tracking-wider mb-1";
    dayLabel.innerText = day;
    gridContainer.appendChild(dayLabel);
  });

  const tempDate = new Date(startDate);
  while (tempDate <= endDate) {
    const dateStr = formatDate(tempDate);
    const posts = dateToPosts[dateStr] || [];
    const count = posts.length;
    const isCurrentMonth = tempDate.getMonth() === month;

    const dayEl = document.createElement("div");
    dayEl.className = "group relative flex items-center justify-center";
    
    const box = document.createElement("div");
    box.className = `size-8 sm:size-10 rounded-lg transition-all duration-300 flex items-center justify-center text-xs font-medium cursor-default`;
    
    if (!isCurrentMonth) {
      box.className += " opacity-20 pointer-events-none";
    }

    if (count === 0) {
      box.className += " bg-slate-100 dark:bg-slate-900/50 text-slate-400";
    } else {
      box.className += " text-white shadow-sm scale-105 z-10";
      if (count === 1) box.className += " bg-emerald-400 dark:bg-emerald-600";
      else if (count <= 3) box.className += " bg-emerald-500 dark:bg-emerald-500";
      else box.className += " bg-emerald-600 dark:bg-emerald-400 shadow-emerald-200 dark:shadow-emerald-900";
      box.innerText = count.toString();
    }

    // Tooltip
    if (count > 0 && isCurrentMonth) {
      const tooltip = document.createElement("div");
      tooltip.className = "absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-3 bg-slate-900 text-white text-xs rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50 shadow-xl pointer-events-none";
      
      const tooltipArrow = document.createElement("div");
      tooltipArrow.className = "absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-900";
      tooltip.appendChild(tooltipArrow);

      const tooltipTitle = document.createElement("div");
      tooltipTitle.className = "font-bold mb-1 border-b border-slate-700 pb-1";
      tooltipTitle.innerText = dateStr;
      tooltip.appendChild(tooltipTitle);

      const list = document.createElement("ul");
      list.className = "space-y-1 mt-1";
      posts.forEach(p => {
        const item = document.createElement("li");
        item.className = "line-clamp-2 leading-tight opacity-90";
        item.innerText = `• ${p.spec.title}`;
        list.appendChild(item);
      });
      tooltip.appendChild(list);
      dayEl.appendChild(tooltip);
    }

    dayEl.appendChild(box);
    gridContainer.appendChild(dayEl);
    tempDate.setDate(tempDate.getDate() + 1);
  }
  
  container.appendChild(gridContainer);
}
