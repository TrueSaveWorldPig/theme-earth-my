interface Post {
  spec: {
    publishTime: string;
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
  archiveData.forEach((year: ArchiveYear) => {
    year.months.forEach((month: ArchiveMonth) => {
      allPosts.push(...month.posts);
    });
  });

  const postDates = allPosts.map((post) => {
    const date = new Date(post.spec.publishTime);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(
      2,
      "0"
    )}`;
  });

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
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(
      today.getDate()
    ).padStart(2, "0")}`;
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(
      yesterday.getDate()
    ).padStart(2, "0")}`;

    // 如果今天没发，但昨天发了，也算连续（或者只看历史最长，或者看当前连续）
    // 这里看当前连续
    let checkDate = new Date(sortedDates[0]);
    const firstDateStr = sortedDates[0];
    
    // 如果最近一次发布不是今天或昨天，连续天数为0
    if (firstDateStr === todayStr || firstDateStr === yesterdayStr) {
      streak = 1;
      for (let i = 1; i < sortedDates.length; i++) {
        const d1 = new Date(sortedDates[i - 1]);
        const d2 = new Date(sortedDates[i]);
        const diff = (d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24);
        if (diff === 1) {
          streak++;
        } else {
          break;
        }
      }
    }
  }
  const streakDaysElement = document.getElementById("streak-days-count");
  if (streakDaysElement) {
    streakDaysElement.innerText = streak.toString();
  }

  // 2. 渲染热力图 (展示最近一年)
  renderHeatmap(postDates);
});

function renderHeatmap(postDates: string[]) {
  const container = document.getElementById("archive-heatmap");
  if (!container) return;

  const dateCounts: Record<string, number> = {};
  postDates.forEach((date) => {
    dateCounts[date] = (dateCounts[date] || 0) + 1;
  });

  const today = new Date();
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(today.getFullYear() - 1);
  // 调整到最近的一个周日开始
  oneYearAgo.setDate(oneYearAgo.getDate() - oneYearAgo.getDay());

  const weeks: HTMLDivElement[] = [];
  let currentWeek = document.createElement("div");
  currentWeek.className = "flex flex-col gap-1";

  const tempDate = new Date(oneYearAgo);
  const months: { name: string; index: number }[] = [];
  let lastMonth = -1;
  let dayCount = 0;

  while (tempDate <= today) {
    const dateStr = `${tempDate.getFullYear()}-${String(tempDate.getMonth() + 1).padStart(2, "0")}-${String(
      tempDate.getDate()
    ).padStart(2, "0")}`;
    const count = dateCounts[dateStr] || 0;

    if (tempDate.getMonth() !== lastMonth) {
      months.push({
        name: tempDate.toLocaleString("default", { month: "short" }),
        index: Math.floor(dayCount / 7),
      });
      lastMonth = tempDate.getMonth();
    }

    const dayEl = document.createElement("div");
    dayEl.className = `size-3 rounded-sm transition-colors duration-300 relative group`;
    
    // 颜色等级
    if (count === 0) dayEl.classList.add("bg-slate-200", "dark:bg-slate-800");
    else if (count === 1) dayEl.classList.add("bg-emerald-200", "dark:bg-emerald-900/50");
    else if (count <= 3) dayEl.classList.add("bg-emerald-400", "dark:bg-emerald-700/50");
    else dayEl.classList.add("bg-emerald-600", "dark:bg-emerald-500/50");

    // Tooltip
    dayEl.setAttribute("title", `${dateStr}: ${count} posts`);

    currentWeek.appendChild(dayEl);

    if (tempDate.getDay() === 6) {
      weeks.push(currentWeek);
      currentWeek = document.createElement("div");
      currentWeek.className = "flex flex-col gap-1";
    }

    tempDate.setDate(tempDate.getDate() + 1);
    dayCount++;
  }
  if (currentWeek.children.length > 0) {
    weeks.push(currentWeek);
  }

  // 渲染
  container.innerHTML = "";
  
  // 月份标签
  const monthLabels = document.createElement("div");
  monthLabels.className = "flex mb-2 text-[10px] text-slate-400 h-4 relative";
  container.appendChild(monthLabels);

  const gridContainer = document.createElement("div");
  gridContainer.className = "flex gap-1";
  container.appendChild(gridContainer);

  weeks.forEach((week, i) => {
    gridContainer.appendChild(week);
    
    // 添加月份标注
    const month = months.find(m => m.index === i);
    if (month) {
      const label = document.createElement("span");
      label.innerText = month.name;
      label.className = "absolute";
      label.style.left = `${i * 16}px`; // 12px size + 4px gap
      monthLabels.appendChild(label);
    }
  });
}
