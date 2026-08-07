package configparser

import (
	"fmt"
	"io"
	"os"
	"strings"

	"gopkg.in/ini.v1"
	"gopkg.in/yaml.v3"
)

func backupFile(filePath string) error {
	src, err := os.Open(filePath)
	if err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return err
	}
	defer src.Close()

	dst, err := os.Create(filePath + ".bak")
	if err != nil {
		return err
	}
	defer dst.Close()

	_, err = io.Copy(dst, src)
	return err
}

func UpdateINI(filePath, section, key, value string) error {
	if err := backupFile(filePath); err != nil {
		return fmt.Errorf("failed to backup file: %v", err)
	}

	// Disable strict parsing to preserve unrecognized flags if any
	opts := ini.LoadOptions{
		IgnoreInlineComment: true,
	}
	
	cfg, err := ini.LoadSources(opts, filePath)
	if err != nil {
		if os.IsNotExist(err) {
			cfg = ini.Empty()
		} else {
			return fmt.Errorf("failed to load ini: %v", err)
		}
	}

	sec := cfg.Section(section)
	if !sec.HasKey(key) {
		_, err := sec.NewKey(key, value)
		if err != nil {
			return err
		}
	} else {
		sec.Key(key).SetValue(value)
	}

	return cfg.SaveTo(filePath)
}

func UpdateYAML(filePath, keyPath, value string) error {
	if err := backupFile(filePath); err != nil {
		return fmt.Errorf("failed to backup file: %v", err)
	}

	data, err := os.ReadFile(filePath)
	if err != nil {
		if os.IsNotExist(err) {
			data = []byte{}
		} else {
			return fmt.Errorf("failed to read yaml: %v", err)
		}
	}

	var root yaml.Node
	if len(data) > 0 {
		if err := yaml.Unmarshal(data, &root); err != nil {
			return fmt.Errorf("failed to unmarshal yaml: %v", err)
		}
	} else {
		root = yaml.Node{
			Kind: yaml.DocumentNode,
			Content: []*yaml.Node{
				{Kind: yaml.MappingNode},
			},
		}
	}

	if len(root.Content) == 0 {
		root.Content = append(root.Content, &yaml.Node{Kind: yaml.MappingNode})
	}
	mapping := root.Content[0]

	keys := strings.Split(keyPath, ".")
	updateYamlNode(mapping, keys, value)

	out, err := yaml.Marshal(&root)
	if err != nil {
		return fmt.Errorf("failed to marshal yaml: %v", err)
	}

	return os.WriteFile(filePath, out, 0644)
}

func updateYamlNode(mapping *yaml.Node, keys []string, value string) {
	if len(keys) == 0 || mapping.Kind != yaml.MappingNode {
		return
	}
	currentKey := keys[0]

	for i := 0; i < len(mapping.Content); i += 2 {
		keyNode := mapping.Content[i]
		valNode := mapping.Content[i+1]

		if keyNode.Value == currentKey {
			if len(keys) == 1 {
				valNode.Value = value
				// Ensure it is scalar
				valNode.Kind = yaml.ScalarNode
				return
			} else {
				updateYamlNode(valNode, keys[1:], value)
				return
			}
		}
	}

	// Not found, append
	newKeyNode := &yaml.Node{
		Kind:  yaml.ScalarNode,
		Value: currentKey,
	}
	var newValNode *yaml.Node

	if len(keys) == 1 {
		newValNode = &yaml.Node{
			Kind:  yaml.ScalarNode,
			Value: value,
		}
	} else {
		newValNode = &yaml.Node{
			Kind: yaml.MappingNode,
		}
		updateYamlNode(newValNode, keys[1:], value)
	}

	mapping.Content = append(mapping.Content, newKeyNode, newValNode)
}

func ReadINI(filePath, section, key string) string {
	cfg, err := ini.Load(filePath)
	if err != nil {
		return ""
	}
	return cfg.Section(section).Key(key).String()
}

func ReadYAML(filePath, keyPath string) string {
	data, err := os.ReadFile(filePath)
	if err != nil {
		return ""
	}
	var m map[string]interface{}
	if err := yaml.Unmarshal(data, &m); err != nil {
		return ""
	}
	keys := strings.Split(keyPath, ".")
	var current interface{} = m
	for _, k := range keys {
		if cmap, ok := current.(map[string]interface{}); ok {
			current = cmap[k]
		} else {
			return ""
		}
	}
	if current != nil {
		return fmt.Sprintf("%v", current)
	}
	return ""
}
