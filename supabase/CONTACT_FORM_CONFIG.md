# 📝 Formulaire de Contact Dynamique

## 🎯 Concept

Le **formulaire de contact** pour créer/modifier des prospects est **entièrement personnalisable** depuis l'interface admin (`/admin/profil`).

La configuration est stockée dans `company_settings.settings.contact_form_config`.

---

## 📦 Structure de `contact_form_config`

```json
{
  "contact_form_config": [
    {
      "id": "name",
      "name": "Nom*",
      "type": "text",
      "placeholder": "Jean Dupont",
      "required": true
    },
    {
      "id": "companyName",
      "name": "Société",
      "type": "text", 
      "placeholder": "Nom de la société (optionnel)",
      "required": false
    },
    {
      "id": "email",
      "name": "Email*",
      "type": "email",
      "placeholder": "jean.dupont@email.com",
      "required": true
    },
    {
      "id": "phone",
      "name": "Téléphone",
      "type": "text",
      "placeholder": "06 12 34 56 78",
      "required": false
    },
    {
      "id": "address",
      "name": "Adresse",
      "type": "text",
      "placeholder": "1 Rue de la Paix, 75002 Paris",
      "required": false
    }
  ]
}
```

---

## 🔧 Récupérer la Configuration

### Avec Supabase :

```javascript
// Récupérer la config du formulaire de contact
const { data: settings, error } = await supabase
  .from('company_settings')
  .select('settings')
  .single()

const contactFormConfig = settings?.settings?.contact_form_config || []
```

---

## ✏️ Modifier la Configuration

### Ajouter un Nouveau Champ :

```javascript
// 1. Récupérer la config actuelle
const { data: currentSettings } = await supabase
  .from('company_settings')
  .select('settings')
  .single()

// 2. Ajouter le nouveau champ
const updatedConfig = [
  ...currentSettings.settings.contact_form_config,
  {
    id: 'linkedin',
    name: 'LinkedIn',
    type: 'text',
    placeholder: 'https://linkedin.com/in/...',
    required: false
  }
]

// 3. Mettre à jour dans Supabase
const { error } = await supabase
  .from('company_settings')
  .update({
    settings: {
      ...currentSettings.settings,
      contact_form_config: updatedConfig
    }
  })
  .eq('id', currentSettings.id)
```

### Réorganiser les Champs :

```javascript
// Changer l'ordre en réorganisant l'array
const reorderedConfig = [
  contactFormConfig[2], // Email en premier
  contactFormConfig[0], // Nom en deuxième
  contactFormConfig[3], // Phone en troisième
  // etc.
]

await supabase
  .from('company_settings')
  .update({
    settings: {
      ...currentSettings.settings,
      contact_form_config: reorderedConfig
    }
  })
  .eq('id', currentSettings.id)
```

### Supprimer un Champ :

```javascript
const configWithoutPhone = contactFormConfig.filter(
  field => field.id !== 'phone'
)

await supabase
  .from('company_settings')
  .update({
    settings: {
      ...currentSettings.settings,
      contact_form_config: configWithoutPhone
    }
  })
  .eq('id', currentSettings.id)
```

---

## 🎨 Utilisation dans les Composants

### `AddProspectModal.jsx` :

```javascript
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

function AddProspectModal() {
  const [formConfig, setFormConfig] = useState([])
  const [formData, setFormData] = useState({})

  useEffect(() => {
    // Charger la config au montage
    loadFormConfig()
  }, [])

  const loadFormConfig = async () => {
    const { data } = await supabase
      .from('company_settings')
      .select('settings')
      .single()
    
    setFormConfig(data?.settings?.contact_form_config || [])
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Créer le prospect avec les champs dynamiques
    const { error } = await supabase
      .from('prospects')
      .insert({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        company_name: formData.companyName,
        address: formData.address,
        owner_id: currentUser.id,
        // + tous les autres champs dynamiques
      })
  }

  return (
    <form onSubmit={handleSubmit}>
      {formConfig.map(field => (
        <div key={field.id}>
          <label>{field.name}</label>
          <input
            type={field.type}
            placeholder={field.placeholder}
            required={field.required}
            value={formData[field.id] || ''}
            onChange={(e) => setFormData({
              ...formData,
              [field.id]: e.target.value
            })}
          />
        </div>
      ))}
      <button type="submit">Ajouter le prospect</button>
    </form>
  )
}
```

---

## ⚙️ Configuration depuis `/admin/profil`

### Interface Admin pour Modifier les Champs :

```javascript
function FormContactConfigEditor() {
  const [config, setConfig] = useState([])

  const addField = () => {
    const newField = {
      id: `field_${Date.now()}`,
      name: 'Nouveau champ',
      type: 'text',
      placeholder: '',
      required: false
    }
    setConfig([...config, newField])
  }

  const updateField = (index, updates) => {
    const updated = [...config]
    updated[index] = { ...updated[index], ...updates }
    setConfig(updated)
  }

  const removeField = (index) => {
    setConfig(config.filter((_, i) => i !== index))
  }

  const saveConfig = async () => {
    const { data: currentSettings } = await supabase
      .from('company_settings')
      .select('*')
      .single()

    await supabase
      .from('company_settings')
      .update({
        settings: {
          ...currentSettings.settings,
          contact_form_config: config
        }
      })
      .eq('id', currentSettings.id)

    toast({ title: 'Configuration sauvegardée !' })
  }

  return (
    <div>
      <h2>Gestion du Formulaire Contact</h2>
      {config.map((field, index) => (
        <div key={field.id} className="border p-4 mb-2">
          <input
            value={field.name}
            onChange={(e) => updateField(index, { name: e.target.value })}
            placeholder="Nom du champ"
          />
          <select
            value={field.type}
            onChange={(e) => updateField(index, { type: e.target.value })}
          >
            <option value="text">Texte</option>
            <option value="email">Email</option>
            <option value="tel">Téléphone</option>
            <option value="number">Nombre</option>
            <option value="date">Date</option>
          </select>
          <input
            value={field.placeholder}
            onChange={(e) => updateField(index, { placeholder: e.target.value })}
            placeholder="Placeholder"
          />
          <label>
            <input
              type="checkbox"
              checked={field.required}
              onChange={(e) => updateField(index, { required: e.target.checked })}
            />
            Obligatoire
          </label>
          <button onClick={() => removeField(index)}>Supprimer</button>
        </div>
      ))}
      <button onClick={addField}>+ Ajouter un champ</button>
      <button onClick={saveConfig}>Enregistrer</button>
    </div>
  )
}
```

---

## 📊 Types de Champs Supportés

| Type | Description | Exemple |
|------|-------------|---------|
| `text` | Texte libre | Nom, Société, Adresse |
| `email` | Email avec validation | contact@example.com |
| `tel` | Téléphone | 06 12 34 56 78 |
| `number` | Nombre | 42 |
| `date` | Date | 2025-11-10 |
| `url` | URL | https://example.com |
| `textarea` | Texte long | Commentaires |

---

## 🔒 Validation des Champs

```javascript
const validateFormData = (formData, formConfig) => {
  const errors = {}

  formConfig.forEach(field => {
    const value = formData[field.id]

    // Champ obligatoire
    if (field.required && !value) {
      errors[field.id] = `${field.name} est obligatoire`
    }

    // Validation email
    if (field.type === 'email' && value) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(value)) {
        errors[field.id] = 'Email invalide'
      }
    }

    // Validation téléphone
    if (field.type === 'tel' && value) {
      const phoneRegex = /^[0-9\s\+\-\(\)]+$/
      if (!phoneRegex.test(value)) {
        errors[field.id] = 'Téléphone invalide'
      }
    }
  })

  return errors
}
```

---

## 🚀 Avantages

✅ **Flexibilité totale** : Ajoutez/supprimez des champs sans toucher au code
✅ **Multi-tenant** : Chaque entreprise peut avoir sa propre config
✅ **Historique** : Les changements sont trackés avec `updated_at`
✅ **Validation dynamique** : Les règles de validation suivent la config
✅ **UI/UX personnalisable** : Chaque client peut adapter le formulaire à son métier

---

## 💡 Cas d'Usage

1. **Agence immobilière** : Ajouter "Surface du bien", "Nombre de pièces"
2. **Service B2B** : Ajouter "SIRET", "Effectif"
3. **E-commerce** : Ajouter "Budget", "Délai souhaité"
4. **Recrutement** : Ajouter "CV", "Disponibilité"

---

**Prêt à personnaliser ! 🎨**
