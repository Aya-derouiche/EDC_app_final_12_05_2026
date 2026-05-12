import React, { useState } from "react";
import { Modal, Form, Row, Col, Button } from "react-bootstrap";
import axios from "axios";
import { toast } from "react-toastify";
import Select from 'react-select'; 

const TiersSaisie = ({ showModal, setShowModal }) => {
  const [tierErrors, setTierErrors] = useState({});

  const [newTier, setNewTier] = useState({
    date_creation: new Date().toISOString().split("T")[0],
    code_tiers: "",
    identite: "",
    type: "",
    autreType: "",
    MF_CIN: "",
    tel: "",
    email: "",
    adresse: "",
    banques: [],
  });

  const banquesOptions = [
    { id: 1, value: "Al Baraka Bank", label: "Al Baraka Bank" },
    { id: 2, value: "AMEN BANK", label: "AMEN BANK" },
    { id: 3, value: "ARAB TUNISIAN BANK", label: "ARAB TUNISIAN BANK" },
    { id: 4, value: "ATTIJARI BANK", label: "ATTIJARI BANK" },
    { id: 5, value: "BANQUE DE TUNISIE", label: "BANQUE DE TUNISIE" },
    {
      id: 6,
      value: "BANQUE INTERNATIONALE ARABE DE TUNISIE (BIAT)",
      label: "BANQUE INTERNATIONALE ARABE DE TUNISIE (BIAT)",
    },
    { id: 7, value: "BH BANK", label: "BH BANK" },
    { id: 8, value: "BANQUE ZITOUNA", label: "BANQUE ZITOUNA" },
    {
      id: 9,
      value: "UNION INTERNATIONALE DE BANQUES",
      label: "UNION INTERNATIONALE DE BANQUES",
    },
  ];

  const axiosWithAuth = () => {
    const token = localStorage.getItem("token");
    return axios.create({
      baseURL: "/api",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  };

  const handleModalChange = (e) => {
    const { name, value } = e.target;
    setNewTier({ ...newTier, [name]: value });
  };

  const handleNewTierSubmit = async (e) => {
    e.preventDefault();

    const formErrors = validateForm();
    if (Object.keys(formErrors).length > 0) {
      setTierErrors(formErrors);
      return;
    }

    try {
      const response = await axiosWithAuth().post("/tiers", newTier);
      const addedTier = response.data;

      toast.success("Tier ajouté avec succès !");

      if (addedTier && addedTier.code_tiers && addedTier.identite) {
        setNewTier((prevTier) => ({
          ...prevTier,
          tiers_saisie: `${addedTier.code_tiers} - ${addedTier.identite}`,
        }));
      }

      setShowModal(false);
    } catch (error) {
      console.error("Error adding tier:", error);
      toast.error("Erreur lors de l'ajout du tier.");
    }
  };


  const handleMultiSelectChange = (selectedOptions) => {
    setNewTier((prev) => ({
      ...prev,
      banques: selectedOptions.map((banque) => ({ value: banque.id })),
    }));
  };


  const handleModalClose = () => setShowModal(false);

  const validateForm = () => {
    const newErrors = {};
    if (!newTier.code_tiers)
      newErrors.code_tiers = "Le code du tiers est requis";
    if (!newTier.type) newErrors.type = "Type du tiers est requis";
    if (!newTier.identite) newErrors.identite = "L'identité est requise";
    if (!newTier.MF_CIN) newErrors.MF_CIN = "Le MF/CIN est requis";
    if (!newTier.tel) newErrors.tel = "Le téléphone est requis";
    if (!newTier.email) newErrors.email = "L'email est requis";
    if (!newTier.adresse) newErrors.adresse = "L'adresse est requise";

    return newErrors;
  };
  return (
    <Modal
      show={showModal}
      onHide={handleModalClose}
      dialogClassName="modal-lg"
      centered
    >
      <Modal.Header>
        <Modal.Title>Ajouter un nouveau tiers</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form onSubmit={handleNewTierSubmit}>
          <Row className="mb-3">
            <Form.Control
              type="hidden"
              name="date_creation"
              value={newTier.date_creation}
              onChange={handleModalChange}
            />
            <Col md={4}>
              <Form.Group controlId="code_tiers">
                <Form.Label>Code du Tiers:</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Code du Tiers"
                  name="code_tiers"
                  value={newTier.code_tiers}
                  onChange={handleModalChange}
                  isInvalid={!!tierErrors.code_tiers}
                />
                <Form.Control.Feedback type="invalid">
                  {tierErrors.code_tiers}
                </Form.Control.Feedback>
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group controlId="type">
                <Form.Label>Type:</Form.Label>
                <Form.Control
                  as="select"
                  className="form-control"
                  name="type"
                  style={{ color: "black" }}
                  onChange={handleModalChange}
                  value={newTier.type}
                  isInvalid={!!tierErrors.type}
                >
                  <option value="">Sélectionnez...</option>
                  <option value="fournisseur">Fournisseur</option>
                  <option value="client">Client</option>
                  <option value="personnel">Personnel</option>
                  <option value="associe">Associé</option>
                  <option value="autre">Autre</option>
                </Form.Control>
                <Form.Control.Feedback type="invalid">
                  {tierErrors.type}
                </Form.Control.Feedback>
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group controlId="autreType">
                <Form.Label>Autre Type:</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Autre Type"
                  name="autreType"
                  value={newTier.autreType}
                  onChange={handleModalChange}
                  disabled={newTier.type !== "autre"} // Disable if tier.type is not "autre"
                />
              </Form.Group>
            </Col>
          </Row>

          <Row className="mb-3">
            <Col md={4}>
              <Form.Group controlId="identite">
                <Form.Label>Identité:</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Identité"
                  name="identite"
                  value={newTier.identite}
                  onChange={handleModalChange}
                  isInvalid={!!tierErrors.identite}
                />
                <Form.Control.Feedback type="invalid">
                  {tierErrors.identite}
                </Form.Control.Feedback>
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group controlId="MF_CIN">
                <Form.Label>MF/CIN:</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="MF/CIN"
                  name="MF_CIN"
                  value={newTier.MF_CIN}
                  onChange={handleModalChange}
                  isInvalid={!!tierErrors.MF_CIN}
                />
                <Form.Control.Feedback type="invalid">
                  {tierErrors.MF_CIN}
                </Form.Control.Feedback>
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group controlId="tel">
                <Form.Label>Téléphone:</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Téléphone"
                  name="tel"
                  value={newTier.tel}
                  onChange={handleModalChange}
                  isInvalid={!!tierErrors.tel}
                />
                <Form.Control.Feedback type="invalid">
                  {tierErrors.tel}
                </Form.Control.Feedback>
              </Form.Group>
            </Col>
          </Row>

          <Row className="mb-3">
            <Col md={4}>
              <Form.Group controlId="email">
                <Form.Label>Email:</Form.Label>
                <Form.Control
                  type="email"
                  placeholder="Email"
                  name="email"
                  value={newTier.email}
                  onChange={handleModalChange}
                  isInvalid={!!tierErrors.email}
                />
                <Form.Control.Feedback type="invalid">
                  {tierErrors.email}
                </Form.Control.Feedback>
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group controlId="adresse">
                <Form.Label>Adresse:</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Adresse"
                  name="adresse"
                  value={newTier.adresse}
                  onChange={handleModalChange}
                  isInvalid={!!tierErrors.adresse}
                />
                <Form.Control.Feedback type="invalid">
                  {tierErrors.adresse}
                </Form.Control.Feedback>
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group controlId="banques">
                <Form.Label>Banques:</Form.Label>
                <Select
                  isMulti
                  options={banquesOptions}
                  className="basic-multi-select"
                  classNamePrefix="select"
                  onChange={handleMultiSelectChange}
                />
              </Form.Group>
            </Col>
          </Row>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button className="btn btn-light" onClick={handleModalClose}>
          Annuler
        </Button>
        <Button
          className="btn btn-info"
          type="submit"
          onClick={handleNewTierSubmit}
        >
          Sauvegarder
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default TiersSaisie;
