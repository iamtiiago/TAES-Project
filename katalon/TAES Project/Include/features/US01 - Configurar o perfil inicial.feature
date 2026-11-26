Feature: US01 - Configurar o perfil inicial

  Background:
    Given que abri o SmartPantry pela primeira vez num navegador de teste

  Scenario: Configurar o perfil inicial na primeira utilização
    When guardo o perfil com as preferências predefinidas
    Then vejo "Casa" como perfil ativo
    And vejo o número de porções "1", regime "Omnívoro", alergias "Nenhuma" e exclusões "Nenhum"

  Scenario: Guardar porções, regime alimentar, alergias e ingredientes excluídos
    When guardo o perfil "Família" com "3" porções, regime "vegetarian", alergias "leite, amendoim" e exclusões "cogumelos, coentros"
    Then vejo "Família" como perfil ativo
    And vejo o número de porções "3", regime "Vegetariano", alergias "leite, amendoim" e exclusões "cogumelos, coentros"

  Scenario: Conservar a configuração do perfil após reabrir a aplicação
    When guardo o perfil "Casa Vegan" com "2" porções, regime "vegan", alergias "soja" e exclusões "coentros"
    Then vejo "Casa Vegan" como perfil ativo
    When recarrego o SmartPantry no mesmo navegador
    Then vejo "Casa Vegan" como perfil ativo
    And vejo o número de porções "2", regime "Vegan", alergias "soja" e exclusões "coentros"

  Scenario: Impedir a criação de um perfil com zero porções
    When tento guardar o perfil inicial com "0" porções
    Then vejo o erro de porções e continuo no formulário inicial
