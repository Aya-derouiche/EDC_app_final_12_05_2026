import React, { useContext, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { UserContext } from './UserProvider.jsx'
import Sidebar from '../Dashboard/Sidebar.jsx'
import Navbar from '../Dashboard/Navbar.jsx'
import Home from '../Home/Home.jsx'
import Entreprises from '../Entreprises/Entreprises.jsx'
import AddEntreprise from '../Entreprises/AddEntreprise.jsx'
import UpdateEntreprise from '../Entreprises/UpdateEntreprise.jsx'
import DetailsEntreprise from '../Entreprises/DetailsEntreprise.jsx'
import Utilisateurs from '../Utilisateurs/Utilisateurs.jsx'
import AddUser from '../Utilisateurs/AddUser.jsx'
import UpdateUser from '../Utilisateurs/UpdateUser.jsx'
import Tiers from '../Tiers/Tiers.jsx'
import AddTier from '../Tiers/AddTier.jsx'
import UpdateTier from '../Tiers/UpdateTier.jsx'
import Achats from '../Achats/Achats.jsx'
import AddAchat from '../Achats/AddAchat.jsx'
import DetailsAchat from '../Achats/DetailsAchat.jsx'
import UpdateAchat from '../Achats/UpdateAchat.jsx'
import ReglementsEmis from '../ReglementsEmis/ReglementsEmis.jsx'
import AddReglement from '../ReglementsEmis/AddReglement.jsx'
import UpdateReglement from '../ReglementsEmis/UpdateReglement.jsx'
import DetailsReglement from '../ReglementsEmis/DetailsReglement.jsx'
import ReglementsRecus from '../ReglementsRecus/ReglementsRecus.jsx'
import AddReglementRecu from '../ReglementsRecus/AddReglementRecu.jsx'
import UpdateReglementRecu from '../ReglementsRecus/UpdateReglementRecu.jsx'
import DetailsReglementRecu from '../ReglementsRecus/DetailsReglementRecu.jsx'
import Commandes from '../Commandes/Commandes.jsx'
import AddCommande from '../Commandes/AddCommande.jsx'
import UpdateCommande from '../Commandes/UpdateCommande.jsx'
import DetailsCommande from '../Commandes/DetailsCommande.jsx'
import Livraisons from '../Livraisons/Livraisons.jsx'
import AddLivraison from '../Livraisons/AddLivraison.jsx'
import UpdateLivraison from '../Livraisons/UpdateLivraison.jsx'
import DetailsLivraison from '../Livraisons/DetailsLivraison.jsx'
import Facturations from '../Facturations/Facturations.jsx'
import AddFacture from '../Facturations/AddFacture.jsx'
import UpdateFacture from '../Facturations/UpdateFacture.jsx'
import DetailsFacture from '../Facturations/DetailsFacture.jsx'
import Versements from '../Versements/Versements.jsx'
import AddVersement from '../Versements/AddVersement.jsx'
import UpdateVersement from '../Versements/UpdateVersement.jsx'
import DetailsVersement from '../Versements/DetailsVersement.jsx'
import DocumentComptabilite from '../DocumentComptabilite/DocumentComptabilite.jsx'
import AddDocCompta from '../DocumentComptabilite/AddDocCompta.jsx'
import UpdateDocCompta from '../DocumentComptabilite/UpdateDocCompta.jsx'
import DocumentDirection from '../DocumentDirection/DocumentDirection.jsx'
import AddDocDirection from '../DocumentDirection/AddDocDirection.jsx'
import UpdateDocDirection from '../DocumentDirection/UpdateDocDirection.jsx'
import UploadFile from '../PointagePersonnel/UploadFile.jsx'
import FichePaie from '../PointagePersonnel/FichePaie.jsx'
import Profile from '../Dashboard/Profile.jsx'
import Configurations from '../Dashboard/Configurations.jsx'
import Requetes from '../Requetes/Requetes.jsx'
import TotalCommandesParPeriode from '../Requetes/TotalCommandesParPeriode.jsx'
import ListeClientsParPeriodeCreation from '../Requetes/ListeClientsParPeriodeCreation.jsx'
import EtatDeFacturation from '../Requetes/EtatDeFacturation.jsx'
import EtatVersementParPeriode from '../Requetes/EtatVersementParPeriode.jsx'
import LivraisonsPrevues from '../Requetes/LivraisonsPrevues.jsx'
import CommandeDetailleesParPeriode from '../Requetes/CommandeDetailleesParPeriode.jsx'
import CommandesParCodeClient from '../Requetes/CommandesParCodeClient.jsx'
import FacturesNonPayee from '../Requetes/FacturesNonPayee.jsx'
import DocumentUploader from "../Documents/DocumentUploader.jsx";
import Chatbot from "../Chatbot/Chatbot.jsx";



const SIDEBAR_W = 255
const NAVBAR_H = 62

const ProtectedRoutes = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const { user } = useContext(UserContext)

  if (!localStorage.getItem('token')) {
    return <Navigate to="/" replace />
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f4f6f9' }}>
      <Sidebar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
      <div
        style={{
          flex: 1,
          marginLeft: SIDEBAR_W,
          paddingTop: NAVBAR_H,
          minHeight: '100vh',
        }}
      >
        <Navbar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
        <Routes>
          <Route path="/home" element={<Home isSidebarOpen={isSidebarOpen} />} />
          <Route path="/entreprises" element={<Entreprises isSidebarOpen={isSidebarOpen} />} />
          <Route path="/addEntreprise" element={<AddEntreprise isSidebarOpen={isSidebarOpen} />} />
          <Route path="/updateEntreprise/:id" element={<UpdateEntreprise isSidebarOpen={isSidebarOpen} />} />
          <Route path="/detailsEntreprise/:id" element={<DetailsEntreprise isSidebarOpen={isSidebarOpen} />} />
          <Route path="/users" element={<Utilisateurs isSidebarOpen={isSidebarOpen} />} />
          <Route path="/addUser" element={<AddUser isSidebarOpen={isSidebarOpen} />} />
          <Route path="/updateUser/:id" element={<UpdateUser isSidebarOpen={isSidebarOpen} />} />
          <Route path="/tiers" element={<Tiers isSidebarOpen={isSidebarOpen} />} />
          <Route path="/addTier" element={<AddTier isSidebarOpen={isSidebarOpen} />} />
          <Route path="/updateTier/:id" element={<UpdateTier isSidebarOpen={isSidebarOpen} />} />
          <Route path="/achats" element={<Achats isSidebarOpen={isSidebarOpen} />} />
          <Route path="/addAchat" element={<AddAchat isSidebarOpen={isSidebarOpen} />} />
          <Route path="/detailsAchat/:id" element={<DetailsAchat isSidebarOpen={isSidebarOpen} />} />
          <Route path="/updateAchat/:id" element={<UpdateAchat isSidebarOpen={isSidebarOpen} />} />
          <Route path="/reglements_emis" element={<ReglementsEmis isSidebarOpen={isSidebarOpen} />} />
          <Route path="/addReglement" element={<AddReglement isSidebarOpen={isSidebarOpen} />} />
          <Route path="/detailsReglement/:id" element={<DetailsReglement isSidebarOpen={isSidebarOpen} />} />
          <Route path="/updateReglement/:id" element={<UpdateReglement isSidebarOpen={isSidebarOpen} />} />
          <Route path="/commandes" element={<Commandes isSidebarOpen={isSidebarOpen} />} />
          <Route path="/addCommande" element={<AddCommande isSidebarOpen={isSidebarOpen} />} />
          <Route path="/detailsCommande/:id" element={<DetailsCommande isSidebarOpen={isSidebarOpen} />} />
          <Route path="/updateCommande/:id" element={<UpdateCommande isSidebarOpen={isSidebarOpen} />} />
          <Route path="/livraisons" element={<Livraisons isSidebarOpen={isSidebarOpen} />} />
          <Route path="/addLivraison" element={<AddLivraison isSidebarOpen={isSidebarOpen} />} />
          <Route path="/updateLivraison/:id" element={<UpdateLivraison isSidebarOpen={isSidebarOpen} />} />
          <Route path="/detailsLivraison/:id" element={<DetailsLivraison isSidebarOpen={isSidebarOpen} />} />
          <Route path="/facturations" element={<Facturations isSidebarOpen={isSidebarOpen} />} />
          <Route path="/addFacture" element={<AddFacture isSidebarOpen={isSidebarOpen} />} />
          <Route path="/detailsFacture/:id" element={<DetailsFacture isSidebarOpen={isSidebarOpen} />} />
          <Route path="/updateFacture/:id" element={<UpdateFacture isSidebarOpen={isSidebarOpen} />} />
          <Route path="/reglements_recus" element={<ReglementsRecus isSidebarOpen={isSidebarOpen} />} />
          <Route path="/addReglementRecu" element={<AddReglementRecu isSidebarOpen={isSidebarOpen} />} />
          <Route path="/detailsReglementRecu/:id" element={<DetailsReglementRecu isSidebarOpen={isSidebarOpen} />} />
          <Route path="/updateReglementRecu/:id" element={<UpdateReglementRecu isSidebarOpen={isSidebarOpen} />} />
          <Route path="/versements" element={<Versements isSidebarOpen={isSidebarOpen} />} />
          <Route path="/addVersement" element={<AddVersement isSidebarOpen={isSidebarOpen} />} />
          <Route path="/detailsVersement/:id" element={<DetailsVersement isSidebarOpen={isSidebarOpen} />} />
          <Route path="/updateVersement/:id" element={<UpdateVersement isSidebarOpen={isSidebarOpen} />} />
          <Route path="/documents_comptabilite" element={<DocumentComptabilite isSidebarOpen={isSidebarOpen} />} />
          <Route path="/addDocCompta" element={<AddDocCompta isSidebarOpen={isSidebarOpen} />} />
          <Route path="/updateDocCompta/:id" element={<UpdateDocCompta isSidebarOpen={isSidebarOpen} />} />
          <Route path="/configurations" element={<Configurations isSidebarOpen={isSidebarOpen} />} />
          <Route path="/documents_direction" element={<DocumentDirection isSidebarOpen={isSidebarOpen} />} />
          <Route path="/addDocDirection" element={<AddDocDirection isSidebarOpen={isSidebarOpen} />} />
          <Route path="/updateDocDirection/:id" element={<UpdateDocDirection isSidebarOpen={isSidebarOpen} />} />
          <Route path="/uploadFile" element={<UploadFile isSidebarOpen={isSidebarOpen} />} />
          <Route path="/fichePaie" element={<FichePaie isSidebarOpen={isSidebarOpen} />} />
          <Route path="/profile" element={<Profile isSidebarOpen={isSidebarOpen} />} />
          <Route path="/TotalCommandesParPeriode" element={<TotalCommandesParPeriode isSidebarOpen={isSidebarOpen} />} />
          <Route path="/ListeClientsParPeriodeCreation" element={<ListeClientsParPeriodeCreation isSidebarOpen={isSidebarOpen} />} />
          <Route path="/EtatDeFacturation" element={<EtatDeFacturation isSidebarOpen={isSidebarOpen} />} />
          <Route path="/EtatVersementParPeriode" element={<EtatVersementParPeriode isSidebarOpen={isSidebarOpen} />} />
          <Route path="/CommandeDetailleesParPeriode" element={<CommandeDetailleesParPeriode isSidebarOpen={isSidebarOpen} />} />
          <Route path="/LivraisonsPrevues" element={<LivraisonsPrevues isSidebarOpen={isSidebarOpen} />} />
          <Route path="/CommandesParCodeClient" element={<CommandesParCodeClient isSidebarOpen={isSidebarOpen} />} />
          <Route path="/FacturesNonPayee" element={<FacturesNonPayee isSidebarOpen={isSidebarOpen} />} />
          <Route path="/requetes" element={<Requetes isSidebarOpen={isSidebarOpen} />} />
          <Route path="/uploadFile" element={<DocumentUploader isSidebarOpen={isSidebarOpen} />} />
          <Route path="/documents/upload" element={<DocumentUploader isSidebarOpen={isSidebarOpen} />} />

</Routes>
        <Chatbot />
      </div>
    </div>
  )
}

export default ProtectedRoutes


