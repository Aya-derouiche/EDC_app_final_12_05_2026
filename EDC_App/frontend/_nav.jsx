import React from 'react'
import { CNavItem, CNavTitle, CNavGroup } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilSpeedometer,
  cilBuilding,
  cilUser,
  cilSettings,
  cilCalculator,
  cilCart,
  cilTruck,
  cilMoney,
} from '@coreui/icons'

const _nav = [
  {
    component: CNavItem,
    name: 'Dashboard',
    to: '/dashboard',
    icon: <CIcon icon={cilSpeedometer} customClassName="nav-icon" />,
    badge: {
      color: 'info',
      text: 'NEW',
    },
  },

  {
    component: CNavTitle,
    name: 'MANAGEMENT',
  },

  {
    component: CNavItem,
    name: 'Entreprises',
    to: '/entreprises',
    icon: <CIcon icon={cilBuilding} customClassName="nav-icon" />,
  },

  {
    component: CNavItem,
    name: 'Users',
    to: '/utilisateurs',
    icon: <CIcon icon={cilUser} customClassName="nav-icon" />,
  },

  {
    component: CNavItem,
    name: 'Tiers',
    to: '/tiers',
    icon: <CIcon icon={cilUser} customClassName="nav-icon" />,
  },

  {
    component: CNavItem,
    name: 'Commandes',
    to: '/commandes',
    icon: <CIcon icon={cilCart} customClassName="nav-icon" />,
  },

  {
    component: CNavItem,
    name: 'Livraisons',
    to: '/livraisons',
    icon: <CIcon icon={cilTruck} customClassName="nav-icon" />,
  },

  {
    component: CNavItem,
    name: 'Achats',
    to: '/achats',
    icon: <CIcon icon={cilMoney} customClassName="nav-icon" />,
  },
  
 {
    component: CNavItem,
    name: 'Upload Document',
    to: '/documents/upload',
    icon: <CIcon icon={cilMoney} customClassName="nav-icon" />,
  },
  {
    component: CNavTitle,
    name: 'SETTINGS',
  },

  {
    component: CNavGroup,
    name: 'Settings',
    icon: <CIcon icon={cilSettings} customClassName="nav-icon" />,
    items: [
      {
        component: CNavItem,
        name: 'Taxes',
        to: '/taxes',
        icon: <CIcon icon={cilCalculator} customClassName="nav-icon" />,
      },
    ],
  },
]

export default _nav