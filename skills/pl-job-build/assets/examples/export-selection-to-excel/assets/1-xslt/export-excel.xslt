<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
                xmlns:fn="fn "
                xmlns:xs="http://www.w3.org/2001/XMLSchema"
                xmlns:pl="http://product-live.com" version="3.0" exclude-result-prefixes="xs fn pl">
  
  <xsl:output method="xml" indent="yes" encoding="UTF-8" cdata-section-elements="Cell" />
  <!--
       + VERSION           : 2.0.13 (adapted for the examples library)
       + TITLE             : Simple Excel export
       + DESCRIPTION       : Export selected items in a generic Excel file or multiples ones, one column per field and one line per items 
       .                     By default we use the first screen available in the table to order the columns in the Excel output,if you want to use a specific screen, set the screen_key parameter 
       .                     We exclude all field that are not visible in any screen
       + INPUT             : Products items.xml
       + OUTPUT            : Generate Excel XML
       + PARAMETERS        : 
       
       TABLE
       + table_file (!REQUIRED!) (file - xml)   : Table file / taxonomy file xml
       
       COLUMNS FILTERS
       + columns_include_medias (boolean - yes/no) : Include all medias related columns (fields of type ATTACHMENT and IMAGE) in the Excel output
       + columns_include_specifics_fields (boolean - yes/no) : Include specifics fields columns from the classification
       + columns_keep_empty_columns (boolean - yes/no) : Keep potentials empty columns in the Excel output, wether selected items contains any data for them or not. This parameter is ignored if you set "output_only_data_structure" to yes
       + columns_ignored_fields_keys (string list, separated by semicolon) : List of fields keys to ignore in the Excel output
       
       OUTPUT TYPE
       + output_file_type (!REQUIRED!) (string : ["one_file_per_category","one_file"])  
       `      ->  one_file_per_category : Generate one Excel file by unique pair of classification and category in the input items
       `      ->  one_file : Generate one Excel file that contains all fields and items data
       
       + output_only_data_structure (boolean - yes/no) : Used to export an empty matrice. Output an empty Excel without any data from the selected items
       + output_file_name (string) : Filename used to the ouput file, (always with added timestamp before)
       
       SCREEN CONFIGURATION
       + screen_key (string) : Screen key used to order columns. By default we take the screen at position 1 in the table.
       + screen_exhaustive (boolean - yes/no) : Restrict the columns in the output by thoses displayed in the setuped screen.
       
       MISC
       + misc_languages (string list, separated by commas) : Only  useful for multi-language table. Languages to use, PL codes of languages separated by commas. Output one file per language.
       + misc_classificationKey (string) : Setup a specific classification key to use. If you want to set a specific classification to use, set this parameter, only table with multiple classifications are concerned by this parameter. By default we'll export all the not archived classifications availables.       
       + misc_display_suffixes : (boolean - yes/no) : Include suffixes with the displayed values in the Excel cells
       + misc_display_images : (boolean - yes/no) : Display images in the cell instead of links
       + misc_multi_values_separator : (string) : Separator used in case of multi-valued cells to display. By default a breakline will be used
  -->
  
  <!--Params-->
  <?region Params?>
  <xsl:param name="table_file" select="''"/>
  <xsl:param name="columns_include_medias" select="'no'" />
  <xsl:param name="columns_include_specifics_fields" select="'yes'" />
  <xsl:param name="columns_keep_empty_columns" select="'no'" />
  <xsl:param name="columns_ignored_fields_keys" select="''" />
  
  <xsl:param name="output_file_type" select="'one_file'" />
  <xsl:param name="output_file_name" select="''" />
  <xsl:param name="output_only_data_structure" select="'no'" />  
  
  <xsl:param name="screen_key" select="''" />
  <xsl:param name="screen_exhaustive" select="'no'" />
  
  <xsl:param name="misc_classificationKey" select="''" />
  <xsl:param name="misc_display_suffixes" select="'yes'" />
  <xsl:param name="misc_languages" select="''" />
  <xsl:param name="misc_display_images" select="'no'" />
  <xsl:param name="misc_multi_values_separator" select="''" />
  <?endregion?>
  
  <!--Parsing params -->
  <?region Parsing params ?>
  
  <!--Parsing parameters-->
  <xsl:variable name="columns_include_medias_bool" select="normalize-space(upper-case($columns_include_medias)) = 'YES' " />
  <xsl:variable name="columns_include_specifics_fields_bool" select="normalize-space(upper-case($columns_include_specifics_fields)) = 'YES' or normalize-space($columns_include_specifics_fields) = ''" />
  <xsl:variable name="output_only_data_structure_bool" select="normalize-space(upper-case($output_only_data_structure)) = 'YES'" />
  <xsl:variable name="screen_exhaustive_bool" select="normalize-space(upper-case($screen_exhaustive)) = 'YES'" />
  <xsl:variable name="columns_keep_empty_columns_bool" select="normalize-space(upper-case($columns_keep_empty_columns)) = 'YES'" />
  <xsl:variable name="misc_display_suffixes_bool" select="normalize-space(upper-case($misc_display_suffixes)) = 'YES'" />
  <xsl:variable name="misc_display_images_bool" select="normalize-space(upper-case($misc_display_images)) = 'YES'" />
  <xsl:variable name="misc_multi_values_separator_char" select="if(normalize-space($misc_multi_values_separator) != 'null' and normalize-space($misc_multi_values_separator) != '') then $misc_multi_values_separator else '&#xA;'" />
  
  <xsl:variable name="ignoredFieldKeys" select="tokenize($columns_ignored_fields_keys,';')" />
  <xsl:variable name="table" select="document($table_file)/Table" />
  <xsl:variable name="tableSchema" select="$table/Schema" />
  <xsl:variable name="tableScreens" select="$tableSchema/Screens/Screen" />
  <xsl:variable name="tableScreensVisibleFieldsKeys" select="distinct-values($tableScreens/Grid/Common/Section/node()/@key | $tableScreens/Grid/Specific/Section/node()/@key)" />
  <xsl:variable name="screen" select="if(normalize-space($screen_key) != '' and normalize-space($screen_key) != 'null') then $tableScreens[@key = $screen_key] else $tableScreens[Position = 1]" />
  <xsl:variable name="tableClassifications" select="$tableSchema/Classifications/Classification[@key = $tableScreensVisibleFieldsKeys and not(@key = $ignoredFieldKeys)]" />
  <xsl:variable name="tableIdentifiers" select="$tableSchema/Identifiers/Identifier[@key = $tableScreensVisibleFieldsKeys and not(@key = $ignoredFieldKeys)]" />
  <xsl:variable name="tableFields" select="$table/Schema/Fields/Field[if(not($columns_include_medias_bool)) then not(@type = ('IMAGE','ATTACHMENT')) else true()][@key = $tableScreensVisibleFieldsKeys and not(@key = $ignoredFieldKeys)]" />
  
  <xsl:variable name="_langs">
    <xsl:choose>
      <xsl:when test="normalize-space($misc_languages) != '' and normalize-space($misc_languages) != 'null'">
        <xsl:for-each select="tokenize($misc_languages, ',')">
          <lang>
            <xsl:value-of select="."/>
          </lang>
        </xsl:for-each>
      </xsl:when>
      <xsl:otherwise>
        <lang>default</lang>
      </xsl:otherwise>
    </xsl:choose>
  </xsl:variable>
  <xsl:variable name="langs" select="$_langs/lang" />
  <?endregion?>
  
  <!--Static variables-->
  <?region Static variables ?>
  <xsl:variable name="config_items_row_startIndex" select="8" />
  <xsl:variable name="config_common_key" select="'PL_COMMON_'" />
  <?endregion?>
  
  
  <xsl:template match="/">
    <xsl:variable name="items" select="Table/Items/Item" />
    <xsl:variable name="items_used_fields_keys" select="distinct-values($items/node()[. != '']/@key)" />
    <xsl:variable name="items_used_classification_keys" select="distinct-values($items/Classification/@key)" />
    <xsl:variable name="items_used_classificationCategories_keys" select="distinct-values($items/Classification/concat(@key, '_', .))" />
    
    <!-- Building table informations : fields to use , categories etc... -->
    <?region Building table informations?>
    <!--Build variable with all fields needed informations from the table : Matrix, positions in screen etc-->
    <xsl:variable name="allFields">
      
      <!--First : Filtering only needed classifications and categories  -->
      <xsl:variable name="usedClassifications">
        <!--Classifications keys to use in this export-->
        <xsl:variable name="classificationsKeys">
          <xsl:choose>
            <xsl:when test="normalize-space($misc_classificationKey) != '' and  normalize-space($misc_classificationKey) != 'null' ">
              <key>
                <xsl:value-of select="$misc_classificationKey"/>
              </key>
            </xsl:when>
            <xsl:otherwise>
              <xsl:for-each select="$items_used_classification_keys">
                <key>
                  <xsl:value-of select="."/>
                </key>
              </xsl:for-each>
            </xsl:otherwise>
          </xsl:choose>
        </xsl:variable>
        
        <Classifications>
          <xsl:for-each select="$tableClassifications[not(@status='ARCHIVED')][$classificationsKeys/key = @key]">
            <Classification key="{@key}">
              <xsl:copy-of select="node()[not(name() = 'Categories')]"/>
              <xsl:variable name="currentKey" select="@key" />
              <xsl:variable name="cats" select="Categories/Category" />
              <Categories>
                <!--Merging categories with exported items, we want to keep only categories with items and then store the items in this category -->
                <xsl:merge>
                  <xsl:merge-source name="category" select="$cats" sort-before-merge="yes">
                    <xsl:merge-key select="@key"/>
                  </xsl:merge-source>
                  <xsl:merge-source name="categoryItems" select="$items/Classification[@key = $currentKey]" sort-before-merge="yes">
                    <xsl:merge-key select="."/>
                  </xsl:merge-source>
                  <xsl:merge-source name="categoryChildrens" select="$cats" sort-before-merge="yes">
                    <xsl:merge-key select="@parent"/>
                  </xsl:merge-source>
                  <xsl:merge-action>
                    <xsl:variable name="category" select="current-merge-group('category')" />
                    <xsl:variable name="categoryChildrens" select="current-merge-group('categoryChildrens')" />
                    <xsl:variable name="categoryItems" select="current-merge-group('categoryItems')" />
                    <!--Ignore category with children categories-->
                    <xsl:if test="$category and not($categoryChildrens)">
                      <xsl:variable name="catKey" select="$category/@key" />
                      <Category key="{@key}">
                        <xsl:copy-of select="$category/node()[contains(name(),'Title')]"/>
                        <xsl:for-each select="$langs">
                          <xsl:variable name="lang" select="." />
                          <FullPath lang="{$lang}">
                            <xsl:value-of select="pl:get_category_full_path($cats, $catKey,$lang)" />
                          </FullPath>
                        </xsl:for-each>
                        <Items>
                          <xsl:copy-of select="$categoryItems/.."/>
                        </Items>
                      </Category>
                    </xsl:if>
                  </xsl:merge-action>
                </xsl:merge>
              </Categories>
            </Classification>
          </xsl:for-each>
          <xsl:if test="count($items[not(Classification)])">
            <Classification key="{$config_common_key}">
              <Categories>
                <Category key="{$config_common_key}">
                  <Title>Commun</Title>
                  <Title-local lang="fra">Commun</Title-local>
                  <Title-local lang="eng">Common</Title-local>
                  <FullPath lang="fra">Commun</FullPath>
                  <FullPath lang="eng">Common</FullPath>
                  <Items>
                    <xsl:copy-of select="$items[not(Classification)]"/>
                  </Items>
                </Category>
              </Categories>
            </Classification>
          </xsl:if>
        </Classifications>
      </xsl:variable>
      <xsl:variable name="tableMatrixSpecificsUsed" select="$table/Schema/Matrix/Specific[concat(@classification, '_', @category) = $items_used_classificationCategories_keys]" />
      <xsl:variable name="usedFields">
        <xsl:choose>
          <xsl:when test="$output_only_data_structure_bool or $columns_keep_empty_columns_bool">
            <xsl:copy-of select="$tableFields"/>
          </xsl:when>
          <xsl:otherwise>
            <xsl:copy-of select="$tableFields[@key = $items_used_fields_keys]"/>
          </xsl:otherwise>
        </xsl:choose>
      </xsl:variable>
      
      <!--Then : Iterate threw all table fields, filtering not archived fields and used fields in our classifications and categories-->
      <xsl:merge>
        <xsl:merge-source name="field" select="$tableIdentifiers[not(@status='ARCHIVED')] 
          | $usedClassifications/Classifications/Classification  
          | $usedFields/Field" sort-before-merge="yes">
          <xsl:merge-key select="@key"/>
        </xsl:merge-source>
        <xsl:merge-source name="field_matrix_common" select="$table/Schema/Matrix/Common/Field[not(@status = 'ARCHIVED')]" sort-before-merge="yes">
          <xsl:merge-key select="@key"/>
        </xsl:merge-source>
        <xsl:merge-source name="field_matrix_specific" select="if($columns_include_specifics_fields_bool) then $tableMatrixSpecificsUsed/Field[not(@status = 'ARCHIVED')] else empty__" sort-before-merge="yes">
          <xsl:merge-key select="@key"/>
        </xsl:merge-source>
        <xsl:merge-source name="screen_columns" select="$screen/Grid/Common/Section/node() | $screen/Grid/Specific/Section/node()" sort-before-merge="yes">
          <xsl:merge-key select="@key"/>
        </xsl:merge-source>
        <xsl:merge-action>
          <xsl:variable name="field" select="current-merge-group('field')" />
          <xsl:variable name="nbOfLinks" select="count(current-merge-group('field_matrix_common')) + count(current-merge-group('field_matrix_specific'))" />
          <xsl:variable name="screen_columns" select="current-merge-group('screen_columns')" />
          <xsl:variable name="isCommon" select="$field/name() = ('Identifier','Classification','Conditional-Formatting')" />
          <!--Filtering only active fields-->
          <xsl:if test="$field and  ($isCommon or $nbOfLinks &gt; 0)">
            <xsl:element name="{$field/name()}">
              <xsl:copy-of select="$field/@*"/>
              <xsl:copy-of select="$field/node()"/>
              <xsl:variable name="field_matrix_specific" select="current-merge-group('field_matrix_specific')" />
              <Matrix>
                <xsl:choose>
                  <xsl:when test="$field_matrix_specific">
                    <xsl:for-each select="$field_matrix_specific">
                      <Category key="{../@category}" classification="{../@classification}" />
                    </xsl:for-each>
                  </xsl:when>
                  <xsl:otherwise>
                    <Common/>
                  </xsl:otherwise>
                </xsl:choose>
              </Matrix>
              <!--Getting field screens positions-->
              <xsl:if test="$screen">
                <ScreenPositions>
                  <xsl:for-each select="$screen_columns">
                    <xsl:variable name="section" select=".." />
                    <xsl:variable name="section_pos" select="$section/@position" />
                    <xsl:variable name="section_key" select="$section/@key" />
                    <xsl:variable name="field_pos" select="@position" />
                    <xsl:variable name="matrix" select="../.." />
                    <ScreenPosition sectionKey="{$section_key}">
                      <xsl:attribute name="category" select="if($matrix/@category) then $matrix/@category else 'COMMON'"/>
                      <xsl:copy-of select="$matrix/@*[name() = 'classification']"/>
                      <xsl:value-of select="(if($matrix/name() != 'Common') then 100000 else 0) + ($section_pos * 100) + $field_pos"/>
                    </ScreenPosition>
                  </xsl:for-each>
                </ScreenPositions>
              </xsl:if>
            </xsl:element>
          </xsl:if>
        </xsl:merge-action>
      </xsl:merge>
    </xsl:variable>
    <xsl:variable name="allFieldsClassifications" select="$allFields/Classification" />
    <?endregion?>
    
    <!--Common columns, commons to all Excel files-->
    <?region Common columns?>
    <xsl:variable name="commonColumns">
      <xsl:variable name="_cols">
        <xsl:for-each select="$allFields/Identifier |  $allFieldsClassifications | $allFields/Conditional-Formatting | $allFields/Field[Matrix/Common]">
          <xsl:sort select="if(ScreenPositions/ScreenPosition) then ScreenPositions/ScreenPosition[1] else 99999999" order="ascending" data-type="number" />
          
          <xsl:variable name="screenPosition" select="ScreenPositions/ScreenPosition[1]" />
          <xsl:variable name="position" select="position()" />
          <xsl:variable name="key" select="@key" />
          <xsl:variable name="index">
            <xsl:choose>
              <!--By default Sorting by Identifiers, Classifications then Fields-->
              <xsl:when test="not($screenPosition)">           
                <xsl:variable name="fieldName" select="name()" />
                <xsl:variable name="fieldType" select="@type" />
                <xsl:variable name="_order">
                  <xsl:choose>
                    <xsl:when test="$fieldName = 'Identifier'">1</xsl:when>
                    <xsl:when test="$fieldName = 'Classification'">2</xsl:when>
                    <xsl:when test="$fieldName = 'Conditional-Formatting'">3</xsl:when>
                    <xsl:when test="$fieldName = 'Field' and not($fieldType = ('IMAGE','ATTACHMENT'))">4</xsl:when>
                    <xsl:when test="$fieldName = 'Field' and $fieldType = ('IMAGE')">5</xsl:when>
                    <xsl:when test="$fieldName = 'Field' and $fieldType = ('ATTACHMENT')">6</xsl:when>
                    <xsl:otherwise>7</xsl:otherwise>
                  </xsl:choose>
                </xsl:variable>
                <xsl:value-of select="$_order * 50 + $position"/>
              </xsl:when>
              <xsl:otherwise>
                <xsl:value-of select="$position"/>
              </xsl:otherwise>
            </xsl:choose>
          </xsl:variable>
          <xsl:if test="$key != $config_common_key">
            <Column index="{$index}" key="{@key}">
              <xsl:if test="$screenPosition">
                <xsl:attribute name="screenPosition" select="$screenPosition"/>
              </xsl:if>
              <Field>
                <xsl:copy-of select="."/>
              </Field>
            </Column>
          </xsl:if>         
        </xsl:for-each>
      </xsl:variable>
      <!--Reorder columns indexes-->
      <xsl:for-each select="$_cols/Column">
        <xsl:sort select="@index" order="ascending" data-type="number" />
        <Column index="{position()}">
          <xsl:copy-of select="@*[name() != 'index']"/>
          <xsl:copy-of select="node()"/>
        </Column>
      </xsl:for-each>
    </xsl:variable>
    <?endregion?>    
    
    <Generate-Excel>
      
      <!--X files per language if needed -->
      <xsl:for-each select="$langs">
        <xsl:variable name="lang" select="." />
        
        <!--Configuration of the different files to create, depending on the parameters -->
        <?region Building files configuration?>
        <xsl:variable name="files">
          <xsl:variable name="date" select="format-dateTime(pl:to_french_date_time(current-dateTime()), '[M01]-[D01]-[Y0001]_[H01]h[m01]m[s01]s')" />
          <xsl:variable name="langText" select="if(normalize-space($lang) != 'default') then concat('_',upper-case($lang)) else ''" />
          <xsl:choose>
            <!--One big Excel File including all classifications and categories-->
            <xsl:when test="$output_file_type = 'one_file'">
              <File>
                <File-Name>
                  <xsl:choose>
                    <xsl:when test="normalize-space($output_file_name) != '' and normalize-space($output_file_name) != 'null'">
                      <xsl:value-of select="pl:get_banalised_filename(string-join( ($date,'_',$output_file_name, $langText,  '.xlsx') , ''))" />  
                    </xsl:when>
                    <xsl:otherwise>
                      <xsl:value-of select="pl:get_banalised_filename(string-join( ($date,'_full_export_items', $langText,  '.xlsx') , ''))" />
                    </xsl:otherwise>
                  </xsl:choose>
                </File-Name>
                <Classifications>
                  <xsl:copy-of select="$allFieldsClassifications"/>
                </Classifications>
              </File>
            </xsl:when>
            <!--One file per categorie and classification-->
            <xsl:otherwise>
              <xsl:for-each select="$allFieldsClassifications">
                <xsl:variable name="classification" select="." />
                <xsl:for-each select="Categories/Category[Items/Item]">
                  <File>
                    <File-Name>
                      <xsl:variable name="categoryName" select="pl:get_localized_field_title(., $lang)" />
                      <xsl:choose>
                        <xsl:when test="normalize-space($output_file_name) != '' and normalize-space($output_file_name) != 'null'">
                          <xsl:value-of select="pl:get_banalised_filename(string-join( ($date,'_', $categoryName,'_', $output_file_name, $langText,  '.xlsx') , ''))" />         
                        </xsl:when>
                        <xsl:otherwise>
                          <xsl:value-of select="pl:get_banalised_filename(string-join( ($date,'_', $categoryName,'_export_items', $langText,  '.xlsx') , ''))" />         
                        </xsl:otherwise>
                      </xsl:choose>
                    </File-Name>
                    <Classifications>
                      <Classification>
                        <xsl:copy-of select="$classification/@*"/>
                        <xsl:copy-of select="$classification/node()[name() != 'Categories']"/>
                        <Categories>
                          <xsl:copy-of select="."/>
                        </Categories>
                      </Classification>
                    </Classifications>
                  </File>
                </xsl:for-each>
              </xsl:for-each>
            </xsl:otherwise>
          </xsl:choose>
        </xsl:variable>
        <?endregion?>
        
        <!--Generating all configured files -->
        <xsl:for-each select="$files/File">
          <xsl:variable name="file" select="." />
          <xsl:variable name="fileClassifications" select="$file/Classifications/Classification" />
          
          <!--Reordorder items inside this file so we know which row is reserved for each item -->
          <?region Reorder items in this file?>
          <xsl:variable name="_fileItems">
            <!--
                 In case of multiple classifications, and output type = all categories in one file, we can have duplicate items 
                 here so we remove them 
            -->
            <xsl:variable name="itemsWithoutDuplicates">
              <xsl:for-each-group select="$fileClassifications/Categories/Category/Items/Item" group-by="string-join(Identifier,'_')">
                <xsl:copy-of select="current-group()[1]"/>
              </xsl:for-each-group>
            </xsl:variable>            
            <xsl:for-each select="$itemsWithoutDuplicates/Item">
              <xsl:sort select="string-join(Identifier,'_')" order="ascending" data-type="text" />
              <Item line="{$config_items_row_startIndex +  (position() - 1) }">
                <xsl:copy-of select="@*"/>
                <xsl:copy-of select="node()"/>
              </Item>
            </xsl:for-each>
          </xsl:variable>
          <?endregion?>
          <xsl:variable name="fileItems" select="$_fileItems/Item" />
          <xsl:variable name="fileItems_used_fields_keys" select="distinct-values($fileItems/node()[. != '']/@key)" />
          
          <File>
            <xsl:copy-of select="$file/File-Name"/>
            <Template-Key>
              <xsl:choose>
                <xsl:when test="$misc_display_images_bool">template_large_rows</xsl:when>
                <xsl:otherwise>template</xsl:otherwise>
              </xsl:choose>
            </Template-Key>
            <?region Columns ?>
            <xsl:variable name="_columns">
              <!--Building all columns for this file : commons and adding specificss -->
              <xsl:variable name="step_1_fileCols">
                <xsl:copy-of select="$commonColumns"/>
                <xsl:variable name="startIndex" select="max($commonColumns/Column/@index) + 1" />
                
                <!--Iterate threw each classification for this file -->
                <xsl:for-each select="$fileClassifications">
                  <xsl:variable name="classificationKey" select="@key" />
                  <!--Keep space between classifications in case there's multiple-->
                  <xsl:variable name="classifStartIndex" select="$startIndex + ((position()-1) * 10000)" />
                  
                  <xsl:for-each select="Categories/Category">
                    <xsl:variable name="categoryKey" select="@key" />
                    <xsl:variable name="categoryStartIndex" select="$classifStartIndex + ((position()-1) * 1000)" />
                    <!--Creating each columns and keeping the tableField associated with the column -->
                    <xsl:for-each select="$allFields/Field[Matrix/Category[@classification = $classificationKey and @key = $categoryKey]]">
                      <xsl:sort select="if(ScreenPositions/ScreenPosition[@classification = $classificationKey and @category = $categoryKey]) then ScreenPositions/ScreenPosition[@classification = $classificationKey and @category = $categoryKey][1] else 999999" order="ascending" data-type="number" />
                      <Column index="{$categoryStartIndex + (position() - 1)}" key="{@key}">
                        <xsl:if test="ScreenPositions/ScreenPosition[@classification = $classificationKey and @category = $categoryKey]">
                          <xsl:attribute name="screenPosition" select="ScreenPositions/ScreenPosition[@classification = $classificationKey and @category = $categoryKey][1]"/>
                        </xsl:if>
                        <Field>
                          <xsl:copy-of select="."/>
                        </Field>
                      </Column>
                    </xsl:for-each>
                  </xsl:for-each>
                </xsl:for-each>
              </xsl:variable>
              
              <!--Keeping only uniques columns fields in the ouput-->
              <xsl:variable name="step_2_fileCols_uniques">
                <xsl:for-each-group select="$step_1_fileCols/Column" group-by="@key">
                  <xsl:copy-of select="current-group()[1]"/>
                </xsl:for-each-group>
              </xsl:variable>
              
              <!--Screen exhaustive => remove all not visible columns-->
              <xsl:variable name="step_3_fileCols_exhaustive">
                <xsl:choose>
                  <xsl:when test="$screen_exhaustive_bool">
                    <xsl:copy-of select="$step_2_fileCols_uniques/Column[@screenPosition]"/>
                  </xsl:when>
                  <xsl:otherwise>
                    <xsl:copy-of select="$step_2_fileCols_uniques"/>
                  </xsl:otherwise>
                </xsl:choose>
              </xsl:variable>
              
              <!--Remove empty columns => remove all columns without items data-->
              <xsl:variable name="step_4_fileCols_emptyColumns">
                <xsl:choose>
                  <xsl:when test="not($columns_keep_empty_columns_bool) and not($output_only_data_structure_bool)">
                    <xsl:copy-of select="$step_3_fileCols_exhaustive/Column[Field/node()/@key = $fileItems_used_fields_keys]"/>
                  </xsl:when>
                  <xsl:otherwise>
                    <xsl:copy-of select="$step_3_fileCols_exhaustive"/>
                  </xsl:otherwise>
                </xsl:choose>
              </xsl:variable>
              
              <!--Output data structure => remove all not needed columns : Conditional-Formattings fields-->
              <xsl:variable name="step_5_fileCols_outputDataStructure">
                <xsl:choose>
                  <xsl:when test="$output_only_data_structure_bool">
                    <xsl:copy-of select="$step_4_fileCols_emptyColumns/Column[Field/node()/name() != 'Conditional-Formatting']"/>
                  </xsl:when>
                  <xsl:otherwise>
                    <xsl:copy-of select="$step_4_fileCols_emptyColumns"/>
                  </xsl:otherwise>
                </xsl:choose>
              </xsl:variable>
              
              <!--Finally Reorder all columns by index in order to have columns indexes that follows each others-->
              <xsl:for-each select="$step_5_fileCols_outputDataStructure/Column">
                <xsl:sort select="@index" order="ascending" data-type="number" />
                <Column index="{position()}">
                  <xsl:copy-of select="@*[name() != 'index']"/>
                  <xsl:copy-of select="node()"/>
                </Column>
              </xsl:for-each>
            </xsl:variable>
            <xsl:variable name="columns" select="$_columns/Column" />
            <?endregion?>
            
            <Sheets>
              <Sheet>
                <Sheet-Name>items</Sheet-Name>
                <Cells>
                  <!-- Excel header -->
                  <?region Excel header ?>
                  <xsl:copy-of select="pl:create_cell(1,2,concat('Export : ' , pl:get_localized_field_title($table, $lang)))"/>
                  <xsl:if test="not($output_only_data_structure_bool) and count($fileItems) &gt; 0">
                    <xsl:copy-of select="pl:create_cell(1,3,concat('(', count($fileItems), ' items)'))"/>
                  </xsl:if>
                  <xsl:if test="normalize-space($lang) != 'default'">
                    <xsl:copy-of select="pl:create_cell(1,4,concat('Language : ',$lang))"/>
                  </xsl:if>
                  <xsl:copy-of select="pl:create_cell(1,5,concat('Generated on ',format-dateTime(pl:to_french_date_time(current-dateTime()), '[D01]/[M01]/[Y0001]:[H01]h[m01]')))"/>
                  <?endregion?>
                  
                  <!-- Columns and data -->
                  <?region Columns an data ?>
                  <xsl:choose>
                    <!--Writing an empty file with only columns-->
                    <xsl:when test="$output_only_data_structure_bool">
                      <xsl:for-each select="$columns">
                        <xsl:copy-of select="pl:writeColumnHeader(., $lang)"/>
                      </xsl:for-each>
                    </xsl:when>
                    <!--Writing columns and data -->
                    <xsl:otherwise>
                      <!--Merge of each column with the items fields, we do that to optimize the execution -->
                      <xsl:merge>
                        <xsl:merge-source name="column" select="$columns" sort-before-merge="yes">
                          <xsl:merge-key select="@key"/>
                        </xsl:merge-source>
                        <xsl:merge-source name="items_fields" select="$fileItems/node()" sort-before-merge="yes">
                          <xsl:merge-key select="@key"/>
                        </xsl:merge-source>
                        <xsl:merge-action>
                          <xsl:variable name="column" select="current-merge-group('column')" />
                          <xsl:variable name="items_fields" select="current-merge-group('items_fields')" />
                          
                          <xsl:if test="$column">
                            <xsl:variable name="colIndex" select="$column/@index" />
                            <xsl:variable name="field" select="$column/Field/node()" />
                            
                            <!-- HEADER -->
                            <xsl:copy-of select="pl:writeColumnHeader($column,$lang)"/>
                            
                            <!-- DATA -->
                            <xsl:if test="$field and $items_fields">  
                              
                              <xsl:choose>
                                <!-- One cell = multiple fields and values concatened for each item-->
                                <xsl:when test="$field/@type = ('MULTIPLE-SELECT','MULTIPLE-SELECT-QUANTIFIED','MULTIPLE-SELECT-QUANTIFIED-WITH-COMMENTS')">
                                  <xsl:for-each-group select="$items_fields" group-by="../@line">
                                    <xsl:variable name="line" select="current-grouping-key()" />
                                    <xsl:variable name="value" select="pl:get_field_value_from_field(current-group(), '', $field, $lang)" />
                                    <xsl:copy-of select="pl:create_cell_with_fieldType($line, $colIndex, $value,$field/@type)"/>
                                  </xsl:for-each-group>
                                </xsl:when>
                                <!--One cell = one field and value, no multiple values for each field and item-->
                                <xsl:otherwise>
                                  <!--Group by value so we only get the displayed value once -->
                                  <xsl:for-each-group select="$items_fields" group-by="concat(.,'##',@suffix)">
                                    <xsl:variable name="fieldValue" select="tokenize(current-grouping-key(), '##')[1]" />
                                    <xsl:variable name="fieldSuffix" select="tokenize(current-grouping-key(), '##')[2]" />
                                    <xsl:variable name="value" select="pl:get_field_value_from_field($fieldValue, $fieldSuffix, $field, $lang)" />
                                    <!--Iterate threw each concerned items and write the cell with the value-->
                                    <xsl:for-each select="current-group()/..">
                                      <xsl:copy-of select="pl:create_cell_with_fieldType(@line, $colIndex, $value,$field/@type)"/>
                                    </xsl:for-each>
                                  </xsl:for-each-group>
                                </xsl:otherwise>
                              </xsl:choose>
                              
                            </xsl:if>
                          </xsl:if>
                        </xsl:merge-action>
                      </xsl:merge>
                    </xsl:otherwise>
                  </xsl:choose>
                  <?endregion?>
                </Cells>
              </Sheet>
              <?region Options sheet?>
              <Sheet>
                <Sheet-Name>options</Sheet-Name>
                <Cells>
                  <xsl:for-each select="$columns[Field/node()[Options or Categories]]">
                    <xsl:variable name="col" select="@index" />
                    <xsl:variable name="field" select="Field/node()" />
                    <!--Field with options -->
                    <xsl:for-each select="$field/Options/Option">
                      <xsl:copy-of select="pl:create_cell(position(),$col, pl:get_localized_field_title(., $lang))"/>
                    </xsl:for-each>
                    <xsl:if test="$field/Categories/Category">
                      <xsl:choose>
                        <!--Outputing all categories-->
                        <xsl:when test="$output_only_data_structure_bool">
                          <xsl:for-each select="$field/Categories/Category">
                            <xsl:copy-of select="pl:create_cell(position(),$col, pl:get_localized_field_title(., $lang))"/>
                          </xsl:for-each>
                        </xsl:when>
                        <!--Filter only needed classifications on this file-->
                        <xsl:otherwise>
                          <xsl:variable name="fieldKey" select="@key" />
                          <xsl:variable name="fileClassifCategoriesKeys" select="$fileClassifications[@key = $fieldKey]/Categories/Category/@key" />
                          <xsl:for-each select="$field/Categories/Category[@key = $fileClassifCategoriesKeys]">
                            <xsl:copy-of select="pl:create_cell(position(),$col, pl:get_localized_field_title(., $lang))"/>
                          </xsl:for-each>
                        </xsl:otherwise>
                      </xsl:choose>
                    </xsl:if>
                  </xsl:for-each>
                </Cells>
              </Sheet>
              <?endregion?>
            </Sheets>
          </File>
        </xsl:for-each>
      </xsl:for-each>
    </Generate-Excel>
  </xsl:template>
  
  <!--Write a column header in the Excel-->
  <xsl:function name="pl:writeColumnHeader">
    <xsl:param name="column" />
    <xsl:param name="lang" />
    
    <xsl:variable name="field" select="$column/Field/node()" />
    <xsl:variable name="colIndex" select="$column/@index" />
    <xsl:if test="$column">
      <!--OptionsList-->
      <xsl:if test="$field/Options or $field/Categories">
        <xsl:variable name="excelColName" select="pl:get_excel_column_name_from_position($colIndex)" />
        <xsl:copy-of select="pl:create_cell(4,$colIndex, concat('options!', $excelColName, '1:', $excelColName, 100000))"/>
      </xsl:if>
      <!--Hidden field key-->
      <xsl:copy-of select="pl:create_cell(5,$colIndex, $field/@key)"/>
      <!--Field type-->
      <xsl:variable name="fieldType">
        <xsl:choose>
          <xsl:when test="$field/@type">
            <xsl:value-of select="$field/@type"/>
          </xsl:when>
          <xsl:otherwise>
            <xsl:choose>
              <xsl:when test="$field/name() = 'Conditional-Formatting'">Compliance</xsl:when>
              <xsl:otherwise>
                <xsl:value-of select="$field/name()"/>
              </xsl:otherwise>
            </xsl:choose>
          </xsl:otherwise>
        </xsl:choose>
      </xsl:variable>
      <xsl:copy-of select="pl:create_cell(6,$colIndex, $fieldType)"/>
      <!--Field title-->
      <xsl:copy-of select="pl:create_cell(7,$colIndex, pl:get_localized_field_title($field,$lang))"/>
    </xsl:if>
  </xsl:function>
  
  <!-- 
       Version 1.0 
  -->
  <xsl:function name="pl:get_excel_column_name_from_position">
    <xsl:param name="dividend" as="xs:integer"/>
    <xsl:variable name="alphabet" select="'ABCDEFGHIJKLMNOPQRSTUVWXYZ'"/>
    <xsl:if test="$dividend > 0">
      <xsl:variable name="modulo" select="($dividend) mod 26" as="xs:integer"/>
      <xsl:value-of select="concat(pl:get_excel_column_name_from_position(xs:integer(($dividend - $modulo) div 26)), substring($alphabet, $modulo, 1))"/>
    </xsl:if>
  </xsl:function>
  
  <!--Version 1.1 : Specific with suffix  -->
  <xsl:function name="pl:get_field_value_from_field">
    <xsl:param name="itemFields" />
    <xsl:param name="fieldSuffix"  />
    <xsl:param name="tableField" />
    <xsl:param name="lang" />
    
    <xsl:variable name="values">
      <xsl:if test="$tableField">
        <xsl:for-each select="$itemFields">
          <xsl:variable name="fieldValue" select="." />
          <value baseValue="{$fieldValue}">
            <xsl:if test=". instance of node()">
              <xsl:if test="@quantity">
                <xsl:attribute name="quantity" select="@quantity"/>
              </xsl:if>
              <xsl:if test="@comment">
                <xsl:attribute name="comment" select="@comment"/>
              </xsl:if>
            </xsl:if>            
            <xsl:choose>
              <xsl:when test="$tableField/Options">
                <xsl:value-of select="pl:get_localized_field_title($tableField/Options/Option[@key=$fieldValue],$lang)"/>
              </xsl:when>
              <xsl:when test="$tableField/Categories">
                <xsl:value-of select="pl:get_localized_field_title($tableField/Categories/Category[@key=$fieldValue],$lang)"/>
              </xsl:when>
              <xsl:when test="$tableField/Statuses or $tableField/Default-Status">
                <xsl:value-of select="pl:get_localized_field_title($tableField/Default-Status[@key=$fieldValue],$lang) | pl:get_localized_field_title($tableField/Statuses/Status[@key=$fieldValue],$lang)"/>
              </xsl:when>
              <xsl:otherwise>
                <xsl:value-of select="$fieldValue"/>
              </xsl:otherwise>                      
            </xsl:choose>
          </value>
        </xsl:for-each>
      </xsl:if>
    </xsl:variable>
    <xsl:choose>
      <xsl:when test="$values/value">
        <xsl:variable name="valuesToString">
          <xsl:for-each select="$values/value">
            <xsl:if test="@quantity">
              <xsl:value-of select="concat(@quantity,':')"/>
            </xsl:if>
            <xsl:value-of select="if(normalize-space(.) != '') then . else @baseValue"/>
            <xsl:if test="@comment">
              <xsl:value-of select="concat(':',@comment)"/>
            </xsl:if>
            <xsl:if test="$misc_display_suffixes_bool">           
              <xsl:choose>
                <xsl:when test="$fieldSuffix">
                  <xsl:text> </xsl:text>
                  <xsl:value-of select="pl:get_localized_field_title($tableField/Suffixes/Suffix[@key = $fieldSuffix],$lang)"/>        
                </xsl:when>
                <xsl:when test="$tableField/Suffix">
                  <xsl:text> </xsl:text>
                  <xsl:value-of select="$tableField/Suffix"/>        
                </xsl:when>
              </xsl:choose>
            </xsl:if>       
            <xsl:if test="position() != last()">
              <xsl:value-of select="$misc_multi_values_separator_char"/>
            </xsl:if>
          </xsl:for-each>  
        </xsl:variable>
        <xsl:value-of select="$valuesToString"/>               
      </xsl:when>
      <xsl:otherwise>
        <xsl:value-of select="$itemFields"/>
      </xsl:otherwise>
    </xsl:choose>    
  </xsl:function>
  
  
  
  <!--
       Version 1.0
       Write Generate-Excel Cell
       Empty value generate no cell in output
  -->
  <xsl:function name="pl:create_cell_with_fieldType">
    <xsl:param name = "line" />
    <xsl:param name = "column" />
    <xsl:param name = "value" />
    <xsl:param name = "fieldType" />
    <xsl:if test="normalize-space($value) != ''">
      <xsl:variable name="cellName">
        <xsl:choose>
          <xsl:when test="upper-case($fieldType) = ('IMAGE','ATTACHMENT')">
            <xsl:choose>
              <xsl:when test="upper-case($fieldType) = 'IMAGE' and $misc_display_images_bool">Cell-Image</xsl:when>
              <xsl:otherwise>Cell-Link</xsl:otherwise>
            </xsl:choose>            
          </xsl:when>
          <xsl:when test="upper-case($fieldType) = ('NUMBER')">
            <xsl:choose>
              <xsl:when test="$value castable as xs:double">Cell-Number</xsl:when>
              <xsl:otherwise>Cell-Text</xsl:otherwise>
            </xsl:choose>
          </xsl:when>
          <xsl:otherwise>Cell-Text</xsl:otherwise>
        </xsl:choose>
      </xsl:variable>
      <xsl:element name="{$cellName}">
        <xsl:attribute name="line" select="$line"/>
        <xsl:attribute name="column" select="$column"/>
        <xsl:choose>
          <xsl:when test="$cellName = 'Cell-Image'">
            <!-- The image cell receives the media link exactly as table-export-items provides it. -->
            <xsl:value-of select="normalize-space($value)"/>
          </xsl:when>
          <xsl:when test="$cellName = 'Cell-Link'">
            <xsl:attribute name="url" select="$value" />
            <xsl:attribute name="type" select="'URL'" />
            <xsl:value-of select="$value"/>
          </xsl:when>
          <xsl:otherwise>
            <xsl:value-of select="$value"/>
          </xsl:otherwise>
        </xsl:choose>    
      </xsl:element>
    </xsl:if>
  </xsl:function>
  
  <xsl:function name="pl:create_cell">
    <xsl:param name = "line" />
    <xsl:param name = "column" />
    <xsl:param name = "value" />
    <xsl:copy-of select="pl:create_cell_with_fieldType($line,$column,$value,'')"/>
  </xsl:function>
  
  <!-- Build categories like category / sub category / sub sub category without codes only text-->
  <xsl:function name="pl:get_category_full_path">
    <xsl:param name="cats" />
    <xsl:param name="key" />
    <xsl:param name="lang" />
    
    <xsl:variable name="pPat">"</xsl:variable>
    <xsl:variable name="pRep">\\"</xsl:variable>
    
    <xsl:variable name="label" select="replace(pl:get_localized_field_title($cats[@key=$key], $lang), $pPat, $pRep)" />
    <xsl:variable name="parentCat" select="$cats[@key=$key]/@parent" />
    <xsl:choose>
      <xsl:when test="$parentCat and $parentCat != ''">
        <xsl:value-of select="concat(pl:get_category_full_path($cats, $parentCat, $lang), ' / ', $label)" />
      </xsl:when>
      <xsl:otherwise>
        <xsl:value-of select="$label" />
      </xsl:otherwise>
    </xsl:choose>
  </xsl:function>
  
  
  <!--Version 1.0-->
  <xsl:function name="pl:get_banalised_filename">
    <xsl:param name="value" />
    <xsl:value-of select="normalize-space(replace(replace(replace(normalize-unicode($value,'NFKD'),' ','_'), '/', '_'), '[^A-Za-z0-9.@:\-_ ]', ''))" />
  </xsl:function>
  
  <!--Version 1.0-->
  <xsl:function name="pl:get_localized_field_title">
    <xsl:param name="element" />
    <xsl:param name="lang" />
    
    <xsl:variable name="baseTitle" select="$element/Title" />
    <xsl:choose>
      <xsl:when test="not($lang) or normalize-space($lang) = '' or normalize-space($lang) = 'default'">
        <xsl:value-of select="$baseTitle"/>
      </xsl:when>
      <xsl:otherwise>
        <xsl:variable name="foundLang" select="$element/Title-Local[upper-case(normalize-space(@lang)) = upper-case(normalize-space($lang))]" />
        <xsl:value-of select="if($foundLang and normalize-space($foundLang) != '') then $foundLang else $baseTitle"/>
      </xsl:otherwise>
    </xsl:choose>
  </xsl:function>
  
  <xsl:function name="pl:to_french_date_time">
    <xsl:param name="date"  as="xs:dateTime"/>
    <xsl:value-of select="xs:dateTime(format-dateTime($date, '[Y0001]-[M01]-[D01]T[H01]:[m01]:[s01].[f]Z', 'en', (), 'Europe/Amsterdam'))"/>
  </xsl:function>
  
  
  
</xsl:stylesheet>