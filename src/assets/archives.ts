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

// 共享 Tooltip 实例
let sharedTooltip: HTMLDivElement | null = null;

document.addEventListener("DOMContentLoaded", () => {
  const archiveData = (window as any).archiveData as ArchiveYear[] || [];
  if (!archiveData.length) return;

  const dateToPosts: Record<string, Post[]> = {};
  let totalPosts = 0;

  // 1. 高效处理数据 (单次遍历)
  archiveData.forEach((year: ArchiveYear) => {
    year.months.forEach((month: ArchiveMonth) => {
      month.posts.forEach((post: Post) => {
        totalPosts++;
        const date = new Date(post.spec.publishTime);
        const dateStr = formatDate(date);
        if (!dateToPosts[dateStr]) dateToPosts[dateStr] = [];
        dateToPosts[dateStr].push(post);
      });
    });
  });

  const postDates = Object.keys(dateToPosts);

  // 2. 异步更新统计数据，避免阻塞 DOMContentLoaded
  requestAnimationFrame(() => {
    const publishDaysElement = document.getElementById("publish-days-count");
    if (publishDaysElement) publishDaysElement.innerText = postDates.length.toString();

    // 计算连续天数 (Streak)
    const sortedDates = postDates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    let streak = 0;
    if (sortedDates.length > 0) {
      const todayStr = formatDate(new Date());
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = formatDate(yesterday);

      if (sortedDates[0] === todayStr || sortedDates[0] === yesterdayStr) {
        streak = 1;
        for (let i = 1; i < sortedDates.length; i++) {
          const d1 = new Date(sortedDates[i - 1]);
          const d2 = new Date(sortedDates[i]);
          if ((d1.getTime() - d2.getTime()) / 86400000 === 1) streak++;
          else break;
        }
      }
    }
    const streakDaysElement = document.getElementById("streak-days-count");
    if (streakDaysElement) streakDaysElement.innerText = streak.toString();
  });

  // 3. 初始热力图显示
  let currentDisplayDate = new Date();
  if (postDates.length > 0) {
    const latestDate = new Date(postDates.sort().reverse()[0]);
    currentDisplayDate = new Date(latestDate.getFullYear(), latestDate.getMonth(), 1);
  }

  const render = () => {
    requestAnimationFrame(() => {
      renderMonthHeatmap(currentDisplayDate, dateToPosts);
      updateHeatmapTitle(currentDisplayDate);
    });
  };

  document.getElementById("prev-month")?.addEventListener("click", renderWithOffset(-1));
  document.getElementById("next-month")?.addEventListener("click", renderWithOffset(1));

  function renderWithOffset(offset: number) {
    return () => {
      currentDisplayDate.setMonth(currentDisplayDate.getMonth() + offset);
      render();
    };
  }

  // 初始化共享 Tooltip
  initSharedTooltip();
  render();
});

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, "0");
  const d = date.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function initSharedTooltip() {
  if (sharedTooltip) return;
  sharedTooltip = document.createElement("div");
  sharedTooltip.className = "fixed pointer-events-none z-[100] w-52 p-3 bg-slate-900 text-white text-xs rounded-xl opacity-0 transition-opacity duration-200 shadow-2xl border border-slate-700/50 backdrop-blur-md";
  document.body.appendChild(sharedTooltip);
}

function updateHeatmapTitle(date: Date) {
  const titleEl = document.getElementById("heatmap-title");
  if (titleEl) {
    titleEl.innerText = `${date.getFullYear()}年${date.getMonth() + 1}月 发布强度`;
  }
}

function renderMonthHeatmap(displayDate: Date, dateToPosts: Record<string, Post[]>) {
  const container = document.getElementById("archive-heatmap");
  if (!container) return;

  const year = displayDate.getFullYear();
  const month = displayDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  
  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - startDate.getDay());
  const endDate = new Date(lastDay);
  endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));

  const fragment = document.createDocumentFragment();
  const gridContainer = document.createElement("div");
  gridContainer.className = "grid grid-cols-7 gap-2 p-2 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700";
  
  ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].forEach(day => {
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
    dayEl.className = "relative flex items-center justify-center";
    
    const box = document.createElement("div");
    box.className = `size-8 sm:size-10 rounded-lg transition-all duration-300 flex items-center justify-center text-xs font-medium ${
      !isCurrentMonth ? "opacity-10 pointer-events-none" : "cursor-default"
    }`;
    
    if (count === 0) {
      box.classList.add("bg-slate-100", "dark:bg-slate-900/50", "text-slate-400");
    } else {
      box.classList.add("text-white", "shadow-sm", "scale-105", "z-10");
      if (count === 1) box.classList.add("bg-emerald-400", "dark:bg-emerald-600");
      else if (count <= 3) box.classList.add("bg-emerald-500");
      else box.classList.add("bg-emerald-600", "dark:bg-emerald-400", "shadow-emerald-200", "dark:shadow-emerald-900");
      box.innerText = count.toString();

      // 绑定共享 Tooltip 事件
      box.addEventListener("mouseenter", (e) => showTooltip(e, dateStr, posts));
      box.addEventListener("mouseleave", hideTooltip);
      box.addEventListener("mousemove", moveTooltip);
    }

    dayEl.appendChild(box);
    gridContainer.appendChild(dayEl);
    tempDate.setDate(tempDate.getDate() + 1);
  }
  
  fragment.appendChild(gridContainer);
  container.innerHTML = "";
  container.appendChild(fragment);
}

function showTooltip(e: MouseEvent, date: string, posts: Post[]) {
  if (!sharedTooltip) return;
  const content = `
    <div class="font-bold mb-1 border-b border-slate-700 pb-1">${date}</div>
    <ul class="space-y-1 mt-1">
      ${posts.map(p => `<li class="line-clamp-2 leading-tight opacity-90">• ${p.spec.title}</li>`).join("")}
    </ul>
  `;
  sharedTooltip.innerHTML = content;
  sharedTooltip.style.opacity = "1";
  moveTooltip(e);
}

function moveTooltip(e: MouseEvent) {
  if (!sharedTooltip) return;
  const x = e.clientX;
  const y = e.clientY;
  // 防止 Tooltip 超出屏幕右侧
  const tooltipWidth = 208; // w-52 = 13rem = 208px
  const left = x + tooltipWidth > window.innerWidth ? x - tooltipWidth - 20 : x + 20;
  sharedTooltip.style.left = `${left}px`;
  sharedTooltip.style.top = `${y - 20}px`;
}

function hideTooltip() {
  if (sharedTooltip) sharedTooltip.style.opacity = "0";
}
