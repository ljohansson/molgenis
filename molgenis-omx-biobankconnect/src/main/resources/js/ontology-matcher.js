(function($, molgenis) {
	"use strict";
	
	var restApi = new molgenis.RestClient();
	var selectedDataSet = null;
	var sortRule = null;
	
	molgenis.addTargetDataSet = function(targetDataSetId) {
		var selectedOptions = $('#target-catalogue').data('selectedOptions') === undefined ? [] : $('#target-catalogue').data('selectedOptions');
		if(targetDataSetId !== null && targetDataSetId !== undefined){
			if($.inArray(targetDataSetId, selectedOptions) === -1){
				selectedOptions.push(targetDataSetId);
				$('#target-catalogue').data('selectedOptions', selectedOptions);
				switchOptions($('#targetDataSets'));
			}
		}
		renderOptions();
		function renderOptions(){
			$('#selectedTargetDataSets').val(selectedOptions);
			var targetCatalogues = $('#target-catalogue');
			var dataSetDiv = $('<div />').addClass('col-md-12');
			targetCatalogues.css('margin-top', '20px').empty().append(dataSetDiv);
			$.each(selectedOptions, function(index, targetDataSetId){
				var dataSet = restApi.get('/api/v1/dataset/' + targetDataSetId);
				var nameDiv = $('<div />').addClass('col-md-offset-1 col-md-3').append(dataSet.Name);
				var controlDiv = $('<div />').addClass('col-md-offset-2 col-md-5');
				var viewCatalogue = $('<button type="btn" class="btn btn-link view-button">View</button>').click(function(){
					if($(this).hasClass('view-button')){
						changeDataSet(targetDataSetId);
						$('#catalogue-container').show();
						$('button.hide-button').empty().append('View').removeClass('hide-button').addClass('view-button');
						$(this).empty().append('Hide').removeClass('view-button').addClass('hide-button');
					}else{
						$('#catalogue-container').hide().find('table').empty();
						$('#search-dataitem').val('');
						$(this).empty().append('View').removeClass('hide-button').addClass('view-button');
					}
					return false;
				});
				var removeCatalogue = $('<button type="btn" class="btn btn-link">Remove</button>').click(function(){
					var index = selectedOptions.indexOf(targetDataSetId);
					selectedOptions.splice(index, 1);
					$('#target-catalogue').data('selectedOptions', selectedOptions);
					renderOptions();
					$('#catalogue-container').hide().find('table').empty();
					$('#search-dataitem').val('');
					return false;
				});
				$('<div />').addClass('btn-group').append(viewCatalogue).append(removeCatalogue).appendTo(controlDiv);
				$('<div />').addClass('row').append(nameDiv).append(controlDiv).appendTo(dataSetDiv);
			});
		}
		
		function switchOptions(selectDOM){
			var index = 0;
			var options = $(selectDOM).find('option');
			options.attr('selected',false).each(function(){
				if(targetDataSetId !== $(this).val()){
					index++;
				}else return false;
			});
			index = index === options.length - 1 ? 0 : index + 1;
			selectDOM.select2('val', $(options[index]).val());
		}
	};
	
	molgenis.selectCatalogue = function(action){
		var selectedOptions = $('#target-catalogue').data('selectedOptions');
		var selectedSourceDataSetId = $('#sourceDataSet').val();
		var selectedDataSets = [];
		if(selectedOptions !== undefined && selectedOptions !== null){
			$.each(selectedOptions, function(index, dataSetId){
				selectedDataSets.push(dataSetId);
			});
		}
		var request = {
			'sourceDataSetId' : selectedSourceDataSetId,
			'selectedDataSetIds' : selectedDataSets
		}
		$.ajax({
			type : 'POST',
			url : molgenis.getContextUrl() + '/ontologymatcher/' + action,
			data : JSON.stringify(request),
			contentType : 'application/json',
			async : false,
			success : function(response) {
			},
			error : function(status) {
				alert('error');
			}
		});	
	};
	
	function changeDataSet (selectedDataSetId){
		if(selectedDataSetId !== undefined && selectedDataSetId !== null && selectedDataSetId !== ''){
			selectedDataSet = restApi.get('/api/v1/dataset/' + selectedDataSetId);
			$('#selected-catalogue').empty().append(selectedDataSet.Name);
			updateMatrix({'updatePager' : true});
			initSearchDataItems();
		}
		
		function initSearchDataItems() {
			var options = {'updatePager' : true};
			$('#search-dataitem').typeahead({
				  hint: true,
				  highlight: true,
				  minLength: 3
			},{
				name: selectedDataSet.Name,
				displayKey: 'name',
				source: function(query, cb) {
					molgenis.dataItemsTypeahead(molgenis.hrefToId(selectedDataSet.href), query, cb);
				}
			});
			$('#search-button').click(function(){
				updateMatrix(options);
			});
			
			$('#search-dataitem').on('keydown', function(e){
			    if (e.which == 13) {
			    	$('#search-button').click();
			    	return false;
			    }
			});
			$('#search-dataitem').on('keyup', function(e){
				if($(this).val() === ''){
					$('#search-dataitem').val('');
					updateMatrix(options);
			    }
			});
		}
	}
	
	function updateMatrix(options){
		var default_options = {
			'dataSetId' : molgenis.hrefToId(selectedDataSet.href),
			'tableHeaders' : ['Name', 'Description'],
			'queryText' : $('#search-dataitem').val(),
			'sortRule' : null,
			'createTableRow' : null,
			'updatePager' : false,
			'container' : $('#container')
		}
		if(options !== undefined && options !== null){
			$.extend(default_options, options);
		}
		molgenis.createMatrixForDataItems(default_options);
	}
	
	function addAllDataSets(){
		var selectedOptions = [];
		$('#targetDataSets option').each(function(){
			selectedOptions.push($(this).val());
		});
		$('#target-catalogue').data('selectedOptions', selectedOptions);
		molgenis.addTargetDataSet();
	}
	
	function removeAllSelectedDataSets(){
		var selectedOptions = [];
		$('#target-catalogue').data('selectedOptions', selectedOptions);
		molgenis.addTargetDataSet();
		$('#catalogue-container').hide().find('table').empty();
	}
	
	$(document).ready(function(){
		
		//Initialize the select element using select2
		$('#targetDataSets').select2({'width' : '200px'});
		
		$('#add-target-dataset').click(function(){
			var targetDataSet = $('#targetDataSets option:selected');
			molgenis.addTargetDataSet(targetDataSet.val());
			return false;
		});
		
		$('#remove-target-all-datasets').click(function(){
			removeAllSelectedDataSets();
			return false;
		});
		
		$('#add-target-all-datasets').click(function(){
			addAllDataSets();
			return false;
		}).trigger('click');
		
		$('#confirm-match').click(function(){
			molgenis.selectCatalogue('match');
		}).hide();
		
		$('#next-button').click(function(){
			molgenis.selectCatalogue('check');
		});
		
		$('#start-match').click(function(){
			molgenis.selectCatalogue('check');
		});
	});
}($, window.top.molgenis = window.top.molgenis || {}));
