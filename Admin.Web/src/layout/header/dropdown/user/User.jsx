import React, { useState } from "react";
import { DropdownToggle, DropdownMenu, Dropdown } from "reactstrap";
import { Icon } from "@/components/Component";
import { LinkList, LinkItem } from "@/components/links/Links";
import UserAvatar from "@/components/user/UserAvatar";
import { useTheme, useThemeUpdate } from "@/layout/provider/Theme";
import { useAuth } from "@/context/AuthContext";

const getInitials = (user) => {
  if (!user) return "?";
  const f = (user.firstName || "")[0] || "";
  const l = (user.lastName  || "")[0] || "";
  if (f || l) return (f + l).toUpperCase();
  return (user.emailAddress || "??").slice(0, 2).toUpperCase();
};

const getDisplayName = (user) => {
  if (!user) return "User";
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ");
  return name || user.emailAddress || "User";
};

const User = () => {
  const theme = useTheme();
  const themeUpdate = useThemeUpdate();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  const initials    = getInitials(user);
  const displayName = getDisplayName(user);
  const email       = user?.emailAddress ?? "";
  const toggle = () => {   
    themeUpdate.sidebarHide();
    setOpen((prevState) => !prevState)
  };

  return (
    <Dropdown isOpen={open} className="user-dropdown" toggle={toggle}>
      <DropdownToggle
        tag="a"
        href="#toggle"
        className="dropdown-toggle"
        onClick={(ev) => {
          ev.preventDefault();
        }}
      >
        <UserAvatar text={initials} className="sm" />
      </DropdownToggle>
      <DropdownMenu end className="dropdown-menu-md dropdown-menu-s1">
        <div className="dropdown-inner user-card-wrap bg-lighter d-none d-md-block">
          <div className="user-card sm">
            <div className="user-avatar">
              <span>{initials}</span>
            </div>
            <div className="user-info">
              <span className="lead-text">{displayName}</span>
              <span className="sub-text">{email}</span>
            </div>
          </div>
        </div>
        <div className="dropdown-inner">
          <LinkList>
            <LinkItem link="/user-profile-regular" icon="user-alt" onClick={toggle}>
              View Profile
            </LinkItem>
            <LinkItem link="/user-profile-setting" icon="setting-alt" onClick={toggle}>
              Account Setting
            </LinkItem>
            <LinkItem link="/user-profile-activity" icon="activity-alt" onClick={toggle}>
              Login Activity
            </LinkItem>
            <li>
              <a className={`dark-switch ${theme.skin === 'dark' ? 'active' : ''}`} href="#" 
              onClick={(ev) => {
                ev.preventDefault();
                themeUpdate.skin(theme.skin === 'dark' ? 'light' : 'dark');
              }}>
                {theme.skin === 'dark' ? 
                  <><em className="icon ni ni-sun"></em><span>Light Mode</span></> 
                  : 
                  <><em className="icon ni ni-moon"></em><span>Dark Mode</span></>
                }
              </a>
            </li>
          </LinkList>
        </div>
        <div className="dropdown-inner">
          <LinkList>
            <LinkItem icon="signout" link={`/auth-login`}>
              Sign Out
            </LinkItem>
          </LinkList>
        </div>
      </DropdownMenu>
    </Dropdown>
  );
};

export default User;
