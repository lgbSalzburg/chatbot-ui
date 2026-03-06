import { ThemeToggle } from "./theme-toggle";
import { useTheme } from "@/context/ThemeContext";
import { Button } from "@/components/ui/button";
import headerLogoLight from "@/assets/logos/Logo_4c_schwarze_Schrift.png";
import headerLogoDark from "@/assets/logos/Logo_weiss.png";
import partnerLogoLight from "@/assets/logos/Logo Co-Branding_ Gefördert von_pos.png";
import partnerLogoDark from "@/assets/logos/Logo Co-Branding_ Gefördert von_neg.png";
import rapidLogo from "@/assets/logos/RAPID Logo(2).png";

type HeaderProps = {
  isLoggedIn: boolean;
  userName?: string;
  onLogout: () => void;
  logoutDisabled?: boolean;
};

export const Header = ({ isLoggedIn, userName, onLogout, logoutDisabled = false }: HeaderProps) => {
  const { isDarkMode } = useTheme();

  return (
    <>
      <header className="flex items-center justify-between px-2 sm:px-4 py-2 bg-background text-black dark:text-white w-full">
        <div className="flex items-center space-x-2 sm:space-x-3">
          <ThemeToggle />
          {isLoggedIn ? (
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-medium">
                Eingeloggt als {userName || "User"}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onLogout}
                disabled={logoutDisabled}
              >
                Abmelden
              </Button>
            </div>
          ) : null}
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
           <img
            src={rapidLogo}
            alt="Rapid logo"
            className="h-12 sm:h-14 w-auto object-contain"
          />
          <img
            src={isDarkMode ? headerLogoDark : headerLogoLight}
            alt="Header logo"
            className="h-12 sm:h-14 w-auto object-contain"
          />
          <img
            src={isDarkMode ? partnerLogoDark : partnerLogoLight}
            alt="Partner logo"
            className="h-12 sm:h-14 w-auto object-contain"
          />
        </div>
      </header>
    </>
  );
};
