import "./styles/tailwind.css";
import "./styles/main.scss";
// @ts-ignore
import Alpine from "alpinejs";
import CryptoJS from "crypto-js";

import colorSchemeSwitcher from "./alpine-data/color-scheme-switcher";
import dropdown from "./alpine-data/dropdown";
import share from "./alpine-data/share";
import uiPermission from "./alpine-data/ui-permission";
import upvote from "./alpine-data/upvote";
import "./components/number-formatter";
import "./utils/overlayscrollbars";
import { timeAgo } from "./moment";

window.Alpine = Alpine;

Alpine.data("dropdown", dropdown);
Alpine.data("colorSchemeSwitcher", colorSchemeSwitcher);
Alpine.data("upvote", upvote);
Alpine.data("share", share);
Alpine.data("uiPermission", uiPermission);

Alpine.magic("timeAgo", () => (date: any) => timeAgo(date));

Alpine.start();

function getCravatarUrl(email: string): string {
  const normalizedEmail = email.trim().toLowerCase();
  const emailMd5 = CryptoJS.MD5(normalizedEmail).toString();
  return `https://cn.cravatar.com/avatar/${emailMd5}`;
}

function extractEmail(value: string): string | null {
  const normalized = value.trim();
  const match = normalized.match(/[^\s<>"']+@[^\s<>"']+/);
  return match ? match[0] : null;
}

function initCommentAvatars(): void {
  const avatars = document.querySelectorAll<HTMLImageElement>(
    "img[data-cravatar-email]"
  );
  avatars.forEach((img) => {
    const raw = img.getAttribute("data-cravatar-email");
    if (!raw) {
      return;
    }
    const email = extractEmail(raw);
    if (email) {
      img.src = getCravatarUrl(email);
    }
  });
}

const onScroll = () => {
  const headerMenu = document.getElementById("header-menu");
  if (window.scrollY > 0) {
    headerMenu?.classList.add("menu-sticky");
  } else {
    headerMenu?.classList.remove("menu-sticky");
  }
};

window.addEventListener("scroll", onScroll);

document.addEventListener("DOMContentLoaded", () => {
  initCommentAvatars();

  const scrollToTopButton = document.getElementById("btn-scroll-to-top");

  if (!scrollToTopButton) {
    return;
  }

  scrollToTopButton.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  window.addEventListener("scroll", _handleScroll);

  function _handleScroll() {
    if (!scrollToTopButton) {
      return;
    }

    const isDown = window.scrollY > 300;

    if (isDown) {
      scrollToTopButton.style.opacity = "1";
    } else {
      scrollToTopButton.style.opacity = "0";
    }
  }
});
